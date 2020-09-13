import DynamoDB, {Key} from 'aws-sdk/clients/dynamodb';
import lodashChunk from 'lodash.chunk';
import {Transform} from 'stream';
import {getDynamoDB} from './databases';
import {Config} from './types';

export const deleteTemporaryTable = async (
  tableName: string,
  config: Config
): Promise<void> =>
  new Promise((resolve, reject) =>
    getDynamoDB('local', config).deleteTable({TableName: tableName}, err => {
      if (err && err.code !== 'ResourceNotFoundException') {
        console.error(err);
        return reject(new Error('Temporary table deletion failed!'));
      }
      console.log('Deleted temporary table', tableName);
      return resolve();
    })
  );

export const describeTable = async (
  type: 'source' | 'target',
  config: Config
): Promise<AWS.DynamoDB.TableDescription> => {
  const regionConfig = config[type];
  if (!regionConfig) {
    throw new Error('Configuration empty');
  }
  return new Promise((resolve, reject) =>
    getDynamoDB(type, config).describeTable(
      {TableName: regionConfig.tableName},
      (err, response) => {
        if (err) {
          console.error(err);
          return reject(new Error(`Failed to describe ${type} table`));
        }
        if (!response.Table) {
          console.info(response);
          return reject(
            new Error(`Failed to get description for ${type} table!`)
          );
        }
        console.log(
          'Fetched description for table',
          regionConfig.tableName,
          '(' + config.source.region + ')'
        );
        return resolve(response.Table);
      }
    )
  );
};

export const createTemporaryTable = async (
  tableInput: AWS.DynamoDB.CreateTableInput,
  config: Config
): Promise<void> =>
  new Promise((resolve, reject) =>
    getDynamoDB('local', config).createTable(tableInput, (err, response) => {
      if (!response || !response.TableDescription || err) {
        console.error(err);
        return reject(new Error('Failed to create table'));
      }
      console.log('Created temporary table', tableInput.TableName);
      return resolve();
    })
  );

const delay = async (ms: number) =>
  new Promise(resolve =>
    ms > 0 ? setTimeout(() => resolve(), ms) : resolve()
  );

export const getItemsFromTable = async (
  itemStream: Transform,
  tableName: string,
  dynamoDB: ReturnType<typeof getDynamoDB>,
  options: {
    limit: number | null;
    throttle: number;
  } = {
    limit: null,
    throttle: 0,
  },
  totalCount = 0,
  startKey: Key | undefined = undefined
): Promise<void> =>
  new Promise(
    (resolve: (object: {count: number; limited: boolean}) => void, reject) =>
      dynamoDB.scan(
        {
          TableName: tableName,
          ExclusiveStartKey: startKey,
          ConsistentRead: true,
          Limit: options.limit || undefined,
        },
        async (err, {Items, Count, LastEvaluatedKey}) => {
          if (err) {
            return reject(new Error('Failed to get items from table'));
          }

          if (!Items || !Count) {
            return reject(new Error('Table did not contain any items'));
          }

          // Add fetched items to stream
          itemStream.push(Items);

          const overLimit = !!(
            options.limit && totalCount + Count >= options.limit
          );

          if (LastEvaluatedKey === undefined || overLimit) {
            return resolve({count: totalCount + Count, limited: overLimit});
          } else {
            await delay(options.throttle);
            return getItemsFromTable(
              itemStream,
              tableName,
              dynamoDB,
              options,
              totalCount + Count,
              LastEvaluatedKey
            );
          }
        }
      )
  )
    .then(({count, limited}) => {
      console.debug(
        `Scanned table ${tableName} (${count} items${
          limited ? `, result limited to ${options.limit}` : ''
        })`
      );
    })
    .catch(e => {
      console.debug('Failed to scan table', tableName);
      itemStream.write(e);
    })
    .finally(() => {
      itemStream.end();
    });

export const insertItemsToTable = async (
  allItems: DynamoDB.ItemList,
  targetTableName: string,
  dynamoDB: ReturnType<typeof getDynamoDB>
): Promise<void> =>
  Promise.all(
    // AWS Supports at most 25 items per chunk
    lodashChunk(allItems, 25).map(
      async items =>
        new Promise((resolve: () => void, reject) =>
          dynamoDB.transactWriteItems(
            {
              TransactItems: items.map(item => ({
                Put: {
                  Item: item,
                  TableName: targetTableName,
                },
              })),
            },
            err => {
              if (err) {
                console.error(err);
                return reject(new Error('Failed to copy items to table'));
              }
              return resolve();
            }
          )
        )
    )
  ).then(() => {
    console.log('Copied', allItems.length, 'items to', targetTableName);
  });
