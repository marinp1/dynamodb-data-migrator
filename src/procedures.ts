// import through2 from 'through2';
// import {DynamoDB} from 'aws-sdk';
import {convertDescriptionToInput} from './utils';

import {Config} from './types';

import {
  describeTable,
  deleteTemporaryTable,
  createTemporaryTable,
  saveConfigToFile,
  /*
  getItemsFromSourceTable,
  copyItemsToTemporaryTable,
  */
} from './operations';

export const initialiseTables = async (config: Config) => {
  // Delete local temporary tables
  await deleteTemporaryTable(config.localConfig.sourceTableName, config);
  await deleteTemporaryTable(config.localConfig.targetTableName, config);

  // 1. Get table descriptions
  const sourceTableInput = convertDescriptionToInput(
    await describeTable('source', config),
    config.localConfig.sourceTableName
  );
  // Target table description can be null
  const targetTableInput = convertDescriptionToInput(
    config.target ? await describeTable('target', config) : null,
    config.localConfig.targetTableName
  );

  if (sourceTableInput === null) {
    throw new Error('Source table input is null, initialisation failed');
  }

  // 2. Create tamporary tables
  await createTemporaryTable(sourceTableInput, config);
  if (targetTableInput !== null)
    await createTemporaryTable(targetTableInput, config);

  await saveConfigToFile(config);
};
