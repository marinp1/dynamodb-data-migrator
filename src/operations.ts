import DynamoDB, {Key} from 'aws-sdk/clients/dynamodb';
import {Transform} from 'stream';
import {getDynamoDB} from './config';

const tableName = 'ReminderSubscriptions';
const temporaryTableName = 'dynamodb-migrator-temporary-table';

export const deleteTemporaryTable = async (): Promise<void> =>
  new Promise((resolve, reject) =>
    getDynamoDB('local').deleteTable({TableName: temporaryTableName}, err => {
      if (err && err.code !== 'ResourceNotFoundException') {
        console.error(err);
        return reject(new Error('Temporary table deletion failed!'));
      }
      console.log('Deleted temporary table', temporaryTableName);
      return resolve();
    })
  );

export const describeSourceTable = async (): Promise<
  AWS.DynamoDB.TableDescription
> =>
  new Promise((resolve, reject) =>
    getDynamoDB('source').describeTable(
      {TableName: tableName},
      (err, {Table}) => {
        if (err) {
          console.error(err);
          return reject(new Error('Failed to describe source table'));
        }
        if (!Table) {
          return reject(
            new Error('Failed to get description for source table!')
          );
        }
        console.log('Fetched description for table', tableName);
        return resolve(Table);
      }
    )
  );

export const createTemporaryTable = async (
  tableInput: AWS.DynamoDB.CreateTableInput
): Promise<void> =>
  new Promise((resolve, reject) =>
    getDynamoDB('local').createTable(tableInput, (err, {TableDescription}) => {
      if (!TableDescription || err) {
        console.error(err);
        return reject(new Error('Failed to create table'));
      }
      console.log('Created temporary table', TableDescription.TableName);
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
        TableName: tableName,
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
      console.log('Scanned table', tableName, '(' + totalCount, 'items)');
    })
    .catch(e => {
      console.log('Failed to scan table', tableName);
      itemStream.write(e);
    })
    .finally(() => {
      itemStream.end();
    });

export const copyItemsToTemporaryTable = async (
  items: DynamoDB.ItemList
): Promise<void> => {
  return new Promise((resolve, reject) => {
    return getDynamoDB('local').transactWriteItems(
      {
        TransactItems: items.map(item => ({
          Put: {
            Item: item,
            TableName: temporaryTableName,
          },
        })),
      },
      err => {
        if (err) {
          return reject(new Error('Failed to copy items to table'));
        }
        console.log('Inserted', items.length, 'items to', temporaryTableName);
        return resolve();
      }
    );
  });
};
