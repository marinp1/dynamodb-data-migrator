import through2 from 'through2';
import {convertDescriptionToInput} from './utils';

import {
  deleteTemporaryTable,
  describeSourceTable,
  createTemporaryTable,
  getItemsFromSourceTable,
} from './operations';
import {DynamoDB} from 'aws-sdk';

const temporaryTableName = 'dynamodb-migrator-temporary-table';

export const main = async () => {
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

    // Create stream to handle reading / writing
    const itemStream = through2({objectMode: true});

    // Start listening stream input
    itemStream.on('data', (chunk: DynamoDB.ItemList) => {
      console.log(chunk);
    });

    itemStream.on('error', e => {
      console.log(e);
    });

    itemStream.on('end', () => {
      console.log('end');
    });

    // 3. Get items from source table and add them to stream
    await getItemsFromSourceTable(itemStream);

    return 0;
  } catch (e) {
    console.error(e);
    return -1;
  }
};

main();
