import through2 from 'through2';
import {DynamoDB} from 'aws-sdk';
import {convertDescriptionToInput} from './utils';

import {Config} from './types';

import {
  describeTable,
  deleteTemporaryTable,
  createTemporaryTable,
  getItemsFromTable,
  insertItemsToTable,
} from './operations';
import {getDynamoDB} from './databases';

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

  if (sourceTableInput === null) {
    throw new Error('Source table input is null, initialisation failed');
  }

  // Target table description can be null
  const targetTableInput = options.useSourceSchema
    ? {...sourceTableInput, TableName: config.localConfig.targetTableName}
    : convertDescriptionToInput(
        config.target ? await describeTable('target', config) : null,
        config.localConfig.targetTableName
      );

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
    const sourceTable = config.source.tableName;
    const targetTable = config.localConfig.sourceTableName;

    if (options.dryrun) {
      console.log('DRY-RUN --- THE FOLLOWING OPERATIONS ARE TO BE DONE:');
    }

    const itemStream = through2({objectMode: true});

    if (options.truncate) {
      if (options.dryrun) {
        console.log(`-- Empty all content from ${targetTable}`);
      }
    }

    let itemCount = 0;
    const sourceDynamoDB = getDynamoDB('source', config);
    const localDynamoDB = getDynamoDB('local', config);

    itemStream.on('data', (chunk: DynamoDB.ItemList) => {
      itemCount += chunk.length;
      if (!options.dryrun) {
        insertItemsToTable(chunk, targetTable, localDynamoDB);
      } else {
        console.log(`-- Make call with ${chunk.length} to ${targetTable}`);
      }
    });

    itemStream.on('error', e => {
      console.log(e);
      return reject(new Error('Failed to scan data from source table'));
    });

    itemStream.on('end', () => {
      if (options.dryrun) {
        console.log(`-- Copy ${itemCount} items to ${targetTable}`);
        console.log('Run with flag --no-dry-run to run the previous steps');
      }
      return resolve();
    });

    getItemsFromTable(itemStream, sourceTable, sourceDynamoDB, {
      limit: options.limit,
      throttle: options.throttle,
    });
  });
};

export const tranformData = (
  tranformFunction: (item: DynamoDB.AttributeMap) => DynamoDB.AttributeMap,
  config: Config,
  options: {
    truncate: boolean;
    dryrun: boolean;
  }
) => {
  return new Promise((resolve, reject) => {
    const sourceTable = config.localConfig.sourceTableName;
    const targetTable = config.localConfig.targetTableName;

    if (options.dryrun) {
      console.log('DRY-RUN --- THE FOLLOWING OPERATIONS ARE TO BE DONE:');
    }

    const itemStream = through2({objectMode: true});
    const localDynamoDB = getDynamoDB('local', config);

    if (options.truncate) {
      if (options.dryrun) {
        console.log(`-- Empty all content from ${targetTable}`);
        console.log(
          '-- Executing the following transformation:',
          JSON.stringify(tranformFunction.prototype)
        );
      }
    }

    let itemCount = 0;

    itemStream.on('data', (chunk: DynamoDB.ItemList) => {
      itemCount += chunk.length;
      if (!options.dryrun) {
        const transformedChunk = chunk.map(tranformFunction);
        insertItemsToTable(
          transformedChunk,
          config.localConfig.targetTableName,
          localDynamoDB
        );
      } else {
        console.log(`-- Make call with ${chunk.length} to ${targetTable}`);
      }
    });

    itemStream.on('error', e => {
      console.log(e);
      return reject(new Error('Failed to scan data from localhost'));
    });

    itemStream.on('end', () => {
      if (options.dryrun) {
        console.log(`-- Copy ${itemCount} items to ${targetTable}`);
        console.log('Run with flag --no-dry-run to run the previous steps');
      }
      return resolve();
    });

    getItemsFromTable(itemStream, sourceTable, localDynamoDB);
  });
};
