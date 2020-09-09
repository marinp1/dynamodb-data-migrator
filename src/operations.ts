import DynamoDB, {Key} from 'aws-sdk/clients/dynamodb';
import lodashChunk from 'lodash.chunk';
import {Transform} from 'stream';
import {getDynamoDB} from './databases';
import config from './config';

export const deleteTemporaryTable = async (): Promise<void> =>
  new Promise((resolve, reject) =>
    getDynamoDB('local').deleteTable(
      {TableName: config.localConfig.temporaryTableName},
      err => {
        if (err && err.code !== 'ResourceNotFoundException') {
          console.error(err);
          return reject(new Error('Temporary table deletion failed!'));
        }
        console.log(
          'Deleted temporary table',
          config.localConfig.temporaryTableName
        );
        return resolve();
      }
    )
  );

export const describeSourceTable = async (): Promise<
  AWS.DynamoDB.TableDescription
> =>
  new Promise((resolve, reject) =>
    getDynamoDB('source').describeTable(
      {TableName: config.source.table},
      (err, response) => {
        if (err) {
          console.error(err);
          return reject(new Error('Failed to describe source table'));
        }
        if (!response.Table) {
          console.info(response);
          return reject(
            new Error('Failed to get description for source table!')
          );
        }
        console.log('Fetched description for table', config.source.table);
        return resolve(response.Table);
      }
    )
  );

export const createTemporaryTable = async (
  tableInput: AWS.DynamoDB.CreateTableInput
): Promise<void> =>
  new Promise((resolve, reject) =>
    getDynamoDB('local').createTable(tableInput, (err, response) => {
      if (!response || !response.TableDescription || err) {
        console.error(err);
        return reject(new Error('Failed to create table'));
      }
      console.log('Created temporary table', tableInput.TableName);
      return resolve();
    })
  );

export const getItemsFromSourceTable = async (
  itemStream: Transform,
  totalCount = 0,
  startKey: Key | undefined = undefined
): Promise<void> =>
  new Promise((resolve: (count: number) => void, reject) =>
    getDynamoDB('source').scan(
      {
        TableName: config.source.table,
        ExclusiveStartKey: startKey,
        ConsistentRead: true,
      },
      (err, {Items, Count, LastEvaluatedKey}) => {
        if (err) {
          return reject(new Error('Failed to get items from table'));
        }

        if (!Items || !Count) {
          return reject(new Error('Table did not contain any items'));
        }

        // Add fetched items to stream
        itemStream.push(Items);

        if (LastEvaluatedKey !== undefined) {
          return getItemsFromSourceTable(
            itemStream,
            totalCount + Count,
            LastEvaluatedKey
          );
        } else {
          return resolve(totalCount + Count);
        }
      }
    )
  )
    .then(totalCount => {
      console.log(
        'Scanned table',
        config.source.table,
        '(' + totalCount,
        'items)'
      );
    })
    .catch(e => {
      console.log('Failed to scan table', config.source.table);
      itemStream.write(e);
    })
    .finally(() => {
      itemStream.end();
    });

export const copyItemsToTemporaryTable = async (
  allItems: DynamoDB.ItemList
): Promise<void> =>
  Promise.all(
    // AWS Supports at most 25 items per chunk
    lodashChunk(allItems, 25).map(
      async items =>
        new Promise((resolve: () => void, reject) =>
          getDynamoDB('local').transactWriteItems(
            {
              TransactItems: items.map(item => ({
                Put: {
                  Item: item,
                  TableName: config.localConfig.temporaryTableName,
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
    console.log(
      'Copied',
      allItems.length,
      'to',
      config.localConfig.temporaryTableName
    );
  });
