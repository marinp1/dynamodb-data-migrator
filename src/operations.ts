import fs from 'fs';
import yaml from 'js-yaml';
import DynamoDB, {Key} from 'aws-sdk/clients/dynamodb';
import lodashChunk from 'lodash.chunk';
import {Transform} from 'stream';
import {getDynamoDB} from './databases';
import {Config} from './types';

export const saveConfigToFile = async (config: Config) => {
  const configAsYaml = yaml.safeDump(config);
  const fileName = `ddm.${config.source.tableName}.yml`;
  return fs.writeFile(fileName, configAsYaml, 'utf8', err => {
    if (err) {
      console.error(err);
      throw new Error('Failed to write configuration');
    }
    console.log(
      'Configuration save as',
      fileName,
      'to current directory, use that with --config command to preload configuration for next steps'
    );
  });
};

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

export const getItemsFromSourceTable = async (
  itemStream: Transform,
  config: Config,
  totalCount = 0,
  startKey: Key | undefined = undefined
): Promise<void> =>
  new Promise((resolve: (count: number) => void, reject) =>
    getDynamoDB('source', config).scan(
      {
        TableName: config.source.tableName,
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
            config,
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
        config.source.tableName,
        '(' + totalCount,
        'items)'
      );
    })
    .catch(e => {
      console.log('Failed to scan table', config.source.tableName);
      itemStream.write(e);
    })
    .finally(() => {
      itemStream.end();
    });

export const copyItemsToTemporaryTable = async (
  allItems: DynamoDB.ItemList,
  config: Config
): Promise<void> =>
  Promise.all(
    // AWS Supports at most 25 items per chunk
    lodashChunk(allItems, 25).map(
      async items =>
        new Promise((resolve: () => void, reject) =>
          getDynamoDB('local', config).transactWriteItems(
            {
              TransactItems: items.map(item => ({
                Put: {
                  Item: item,
                  TableName: config.localConfig.sourceTableName,
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
      config.localConfig.sourceTableName,
      '(localhost) from',
      config.source.tableName,
      '(' + config.source.region + ')'
    );
  });
