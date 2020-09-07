import {getDynamoDB} from './config';
import {convertDescriptionToInput} from './utils';
import DynamoDB, {Key} from 'aws-sdk/clients/dynamodb';

const tableName = 'ReminderSubscriptions';
const temporaryTableName = 'dynamodb-migrator-temporary-table';

const deleteTemporaryTable = async (): Promise<void> =>
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

const describeSourceTable = async (): Promise<AWS.DynamoDB.TableDescription> =>
  new Promise((resolve, reject) =>
    getDynamoDB('source').describeTable(
      {TableName: tableName},
      (err, {Table}) => {
        if (err) {
          console.error(err);
          return reject(new Error('Temporary table deletion failed!'));
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

const createTemporaryTable = async (
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

const getItemsFromSourceTable = async (
  items: DynamoDB.AttributeMap[],
  startKey: Key | undefined = undefined
): Promise<DynamoDB.ItemList> =>
  new Promise((resolve, reject) =>
    getDynamoDB('source').scan(
      {
        TableName: tableName,
        ExclusiveStartKey: startKey,
      },
      (err, {Items, Count, LastEvaluatedKey}) => {
        if (err) {
          console.error(err);
          return reject(new Error('Failed to get items from table'));
        }

        if (!Items || !Count) {
          return reject(new Error('Table did not contain any items'));
        }

        console.log(
          'Fetched',
          Count,
          'items (total',
          Count + items.length,
          'items)'
        );
        const combinedItems = items.concat(...Items);
        if (LastEvaluatedKey !== undefined) {
          console.log('Table read was partial, fetching more data');
          return getItemsFromSourceTable(combinedItems, LastEvaluatedKey);
        }
        return resolve(combinedItems);
      }
    )
  );

(async () => {
  try {
    // 0. Delete local temporary table
    await deleteTemporaryTable();

    // 1. Describe source table
    const sourceTableDescription = await describeSourceTable();
    // 1a. Validate & fix indexes & use temporary table name
    const tableInput = convertDescriptionToInput(
      sourceTableDescription,
      temporaryTableName
    );

    // 2. Create temporary table from source table description
    await createTemporaryTable(tableInput);

    // 3. Get items from source table
    const sourceItems = await getItemsFromSourceTable([]);
    console.log(sourceItems);
    return 0;
  } catch (e) {
    console.error(e);
    return -1;
  }
})();
