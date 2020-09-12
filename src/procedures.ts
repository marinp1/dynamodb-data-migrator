import through2 from 'through2';
import {DynamoDB} from 'aws-sdk';
import {convertDescriptionToInput} from './utils';

import {Config} from './types';

import {
  describeTable,
  deleteTemporaryTable,
  createTemporaryTable,
  getItemsFromSourceTable,
  copyItemsToTemporaryTable,
} from './operations';

export const initialiseTables = async (
  config: Config,
  options: {useSourceSchema: boolean}
) => {
  // Delete local temporary tables
  await deleteTemporaryTable(config.localConfig.sourceTableName, config);
  await deleteTemporaryTable(config.localConfig.targetTableName, config);

  // 1. Get table descriptions
  const sourceTableInput = convertDescriptionToInput(
    await describeTable('source', config),
    config.localConfig.sourceTableName
  );

  // Target table description can be null
  const targetTableInput = options.useSourceSchema
    ? sourceTableInput
    : convertDescriptionToInput(
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
};

export const copyFromSourceToTemporary = async (
  config: Config,
  options: {
    limit: number | null;
    truncate: boolean;
    dryrun: boolean;
    throttle: number;
  } = {
    limit: null,
    truncate: false,
    dryrun: true,
    throttle: 0,
  }
) => {
  return new Promise((resolve, reject) => {
    if (options.dryrun) {
      console.log('DRY-RUN --- THE FOLLOWING OPERATIONS ARE TO BE DONE:');
    }

    const itemStream = through2({objectMode: true});

    if (options.truncate) {
      if (options.dryrun) {
        console.log(
          `-- Empty all content from ${config.localConfig.sourceTableName}`
        );
      }
    }

    let itemCount = 0;

    itemStream.on('data', (chunk: DynamoDB.ItemList) => {
      itemCount += chunk.length;
      if (!options.dryrun) {
        copyItemsToTemporaryTable(chunk, config);
      }
    });

    itemStream.on('error', e => {
      console.log(e);
      return reject(new Error('Failed to scan data from source table'));
    });

    itemStream.on('end', () => {
      if (options.dryrun) {
        console.log(
          `-- Copy ${itemCount} items to ${config.localConfig.sourceTableName}`
        );
        console.log('Run with flag --no-dry-run to run the previous steps');
      }
      return resolve();
    });

    getItemsFromSourceTable(itemStream, config, {
      limit: options.limit,
      throttle: options.throttle,
    });
  });
};
