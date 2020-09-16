import through2 from 'through2';
import {DynamoDB} from 'aws-sdk';

import {Operations, RegionType} from '../types';
import {delay} from '../utils';

export const migrateAndTransform = async (
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
  const {source, target, tranformFunction} = parameters;

  // Wait a while before migration
  // TODO: Wait only if table was created
  if (!options.dryrun && target.region !== 'local') {
    process.stdout.write('Waiting 30 seconds');
    for (let i = 0; i < 30; i++) {
      process.stdout.write('.');
      await delay(1000);
    }
    process.stdout.write('\n');
  }

  // Validate that tables for the operation exist
  try {
    await tableOperations[source.region].describe(source.tableName);
  } catch (e) {
    if (options.dryrun) {
      console.log('[ERROR]', source.tableName, 'was not found');
    } else {
      throw e;
    }
  }

  try {
    await tableOperations[target.region].describe(target.tableName);
  } catch (e) {
    if (options.dryrun) {
      console.log(
        '[WARNING]',
        target.tableName,
        'was not found, to create the table during migrate use --create-table flag'
      );
    } else {
      throw e;
    }
  }

  return new Promise((resolve, reject) => {
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

        tableOperations[target.region]
          .write(transformedChunk, target.tableName)
          .then(() => {
            //console.log('');
          })
          .catch(e => {
            if (e.message === 'ProvisionedThroughputExceededException') {
              return reject(
                'Provisioned throughput exceeded, consider using throttle parameter'
              );
            } else {
              return reject(
                'Failed to write items to table, please try again!'
              );
            }
          });
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
    });

    return tableOperations[source.region]
      .scanToStream(itemStream, source.tableName, {
        limit: options.limit,
        throttle: options.throttle,
      })
      .then(() => resolve())
      .catch(() => reject(new Error('Failed to scan to stream')));
  });
};
