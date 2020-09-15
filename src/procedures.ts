import through2 from 'through2';
import {DynamoDB} from 'aws-sdk';
import {convertDescriptionToInput} from './utils';

import {Operations, RegionType} from './types';

export const initialiseTables = async (
  tableOperations: Record<RegionType, ReturnType<Operations>>,
  parameters: {
    sourceTableName: string;
    targetTableName: string | null;
    localSourceTableName: string;
    localTargetTableName: string;
  },
  options: {useSourceSchema: boolean}
) => {
  const {
    sourceTableName,
    targetTableName,
    localSourceTableName,
    localTargetTableName,
  } = parameters;

  // Delete local temporary tables
  await tableOperations.local.delete(localSourceTableName);
  await tableOperations.local.delete(localTargetTableName);

  // 1. Get table descriptions
  const sourceTableInput = convertDescriptionToInput(
    await tableOperations.source.describe(sourceTableName),
    localSourceTableName
  );

  if (sourceTableInput === null) {
    throw new Error('Source table input is null, initialisation failed');
  }

  // Target table description can be null
  const targetTableInput = options.useSourceSchema
    ? {...sourceTableInput, TableName: localTargetTableName}
    : convertDescriptionToInput(
        targetTableName
          ? await tableOperations.target.describe(targetTableName)
          : null,
        localTargetTableName
      );

  // 2. Create tamporary tables
  await tableOperations.local.create(sourceTableInput);
  if (targetTableInput !== null) {
    await tableOperations.local.create(targetTableInput);
  }
};

export const copyFromSourceToTarget = async (
  tableOperations: Record<RegionType, ReturnType<Operations>>,
  parameters: {
    source: {region: RegionType; tableName: string};
    target: {region: RegionType; tableName: string};
    tranformFunction?: (item: DynamoDB.AttributeMap) => DynamoDB.AttributeMap;
  },
  options: Partial<{
    limit: number;
    truncate: boolean;
    dryrun: boolean;
    throttle: number;
  }>
) => {
  return new Promise((resolve, reject) => {
    const {source, target, tranformFunction} = parameters;

    if (options.dryrun) {
      console.log('DRY-RUN --- THE FOLLOWING OPERATIONS ARE TO BE DONE:');
    }

    const itemStream = through2({objectMode: true});

    if (options.truncate) {
      if (options.dryrun) {
        console.log(`-- Empty all content from ${target.tableName}`);
        if (tranformFunction) {
          console.log(
            '-- Executing the following transformation:',
            JSON.stringify(tranformFunction.prototype)
          );
        }
      }
    }

    let itemCount = 0;

    itemStream.on('data', (chunk: DynamoDB.ItemList) => {
      itemCount += chunk.length;
      if (!options.dryrun) {
        const transformedChunk = tranformFunction
          ? chunk.map(tranformFunction)
          : chunk;
        tableOperations[target.region].write(
          transformedChunk,
          target.tableName
        );
      } else {
        console.log(`-- Make call with ${chunk.length} to ${target.tableName}`);
      }
    });

    itemStream.on('error', e => {
      console.log(e);
      return reject(new Error('Failed to scan data from source table'));
    });

    itemStream.on('end', () => {
      if (options.dryrun) {
        console.log(`-- Copy ${itemCount} items to ${target.tableName}`);
        console.log('Run with flag --no-dry-run to run the previous steps');
      }
      return resolve();
    });

    tableOperations[source.region].scanToStream(itemStream, source.tableName, {
      limit: options.limit,
      throttle: options.throttle,
    });
  });
};
