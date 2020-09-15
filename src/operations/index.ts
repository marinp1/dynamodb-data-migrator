import DynamoDB from 'aws-sdk/clients/dynamodb';
import {Transform} from 'stream';

import {createTable} from './create';
import {deleteTable} from './delete';
import {describeTable} from './describe';
import {writeItemsToTable} from './write';
import {scanTableToStream} from './scan';

export default {
  create: (dynamoDb: DynamoDB) => (tableInput: DynamoDB.CreateTableInput) =>
    createTable(tableInput, dynamoDb),
  delete: (dynamoDb: DynamoDB) => (tableName: string) =>
    deleteTable(tableName, dynamoDb),
  describe: (dynamoDb: DynamoDB) => (tableName: string) =>
    describeTable(tableName, dynamoDb),
  write: (dynamoDb: DynamoDB) => (
    items: DynamoDB.ItemList,
    tableName: string
  ) => writeItemsToTable(items, tableName, dynamoDb),
  scanToStream: (dynamoDb: DynamoDB) => (
    streamToPopulate: Transform,
    tableName: string,
    options?: {limit: number | null; throttle: number}
  ) => scanTableToStream(streamToPopulate, tableName, dynamoDb, options),
};
