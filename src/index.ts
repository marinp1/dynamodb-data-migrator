import through2 from 'through2';
import {DynamoDB} from 'aws-sdk';
import {convertDescriptionToInput} from './utils';

import config from './config';

import {
  deleteTemporaryTable,
  describeSourceTable,
  createTemporaryTable,
  getItemsFromSourceTable,
  copyItemsToTemporaryTable,
} from './operations';

export const main = async () => {
  try {
    // 0. Delete local temporary table
    await deleteTemporaryTable();

    // 1. Describe source table
    const sourceTableDescription = await describeSourceTable();
    // 1a. Validate & fix indexes & use temporary table name
    const tableInput = convertDescriptionToInput(
      sourceTableDescription,
      config.localConfig.temporaryTableName
    );

    // 2. Create temporary table from source table description
    await createTemporaryTable(tableInput);

    // Create stream to handle reading / writing
    const itemStream = through2({objectMode: true});

    // Start listening stream input
    itemStream.on('data', (chunk: DynamoDB.ItemList) => {
      // TODO: Transform data?
      // 4. Add items to table
      copyItemsToTemporaryTable(chunk);
    });

    itemStream.on('error', e => {
      console.log(e);
      throw new Error('Failed to scan data from source table');
    });

    // 3. Get items from source table and add them to stream
    await getItemsFromSourceTable(itemStream);

    // TODO: 5. Validate number of entries in table

    return 0;
  } catch (e) {
    console.error(e);
    return -1;
  }
};

main();
