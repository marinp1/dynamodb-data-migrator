import yargs from 'yargs';
import * as procedures from './procedures';
import {saveConfigToFile, loadConfigFromFile} from './config';
import {Config} from './types';

interface InitialiseArguments {
  'source-profile': string;
  'source-region': string;
  'source-table': string;
  'target-profile': string;
  'target-region': string;
  'target-table': string | undefined;
  'local-dynamodb-endpoint': string;
  'local-source-tablename': string;
  'local-target-tablename': string;
  'use-source-schema': boolean;
}

interface FetchArguments {
  'config-file': string;
  'dry-run': boolean;
  truncate: boolean;
  limit: number;
  throttle: number;
}

/*
yargs.command('transform', 'transform data', yargs => {
  yargs.option('config-file', {});
  yargs.option('transform-file', {});
});

yargs.command('post', 'post data', yargs => {
  yargs.option('config-file', {});
  yargs.option('no-dry-run', {});
  yargs.option('throttle-value', {});
});
*/

yargs
  .usage('$0 <initialize> [args]')
  .command<InitialiseArguments>(
    'initialize',
    'initialise migration',
    yargs => {
      yargs
        .option('source-profile', {
          description:
            'AWS profile to use for fetching, set empty for localhost',
          alias: 'SP',
          default: 'localhost',
          type: 'string',
        })
        .option('source-region', {
          description:
            'AWS region to use for fetching, set empty for localhost',
          alias: 'SR',
          default: 'localhost',
          type: 'string',
        })
        .option('source-table', {
          description: 'DynamoDB table to fetch data from',
          alias: 'ST',
          type: 'string',
        })
        .option('target-profile', {
          description:
            'AWS profile to use for posting, set empty for localhost',
          alias: 'TP',
          default: 'localhost',
          type: 'string',
        })
        .option('target-region', {
          description: 'AWS region to use for posting, set empty for localhost',
          alias: 'TR',
          default: 'localhost',
          type: 'string',
        })
        .option('target-table', {
          description: 'DynamoDB table to post data to',
          alias: 'TT',
          type: 'string',
        })
        .option('local-dynamodb-endpoint', {
          describe: 'dynamob endpoint used for local migration',
          default: 'http://localhost:8000',
          type: 'string',
        })
        .option('local-source-tablename', {
          describe:
            'default name for source temporary table used for migration',
          default: 'migrator-temp-source',
          type: 'string',
        })
        .option('local-target-tablename', {
          describe:
            'default name for source temporary table used for migration',
          default: 'migrator-temp-target',
          type: 'string',
        })
        .option('use-source-schema', {
          describe: 'if source table schema should be used for target',
          default: false,
          type: 'boolean',
        })
        .demandOption('source-table', 'source table name is required');
    },
    argv => {
      const startTs = Date.now();
      console.log('Starting procedure initialize...');
      const config: Config = {
        source: {
          profile: argv['source-profile'],
          region: argv['source-region'],
          tableName: argv['source-table'],
        },
        target: argv['target-table']
          ? {
              profile: argv['target-profile'],
              region: argv['target-region'],
              tableName: argv['target-table'],
            }
          : null,
        localConfig: {
          endpoint: argv['local-dynamodb-endpoint'],
          sourceTableName: argv['local-source-tablename'],
          targetTableName: argv['local-target-tablename'],
        },
      };

      return procedures
        .initialiseTables(config, {useSourceSchema: argv['use-source-schema']})
        .then(() => saveConfigToFile(config))
        .then(() => {
          console.log(
            'Procedure completed in',
            ((Date.now() - startTs) / 1000).toFixed(2),
            'seconds'
          );
        });
    }
  )
  .command<FetchArguments>(
    'fetch',
    'fetch data',
    yargs => {
      yargs
        .option('config-file', {
          description: 'configuration file to use for fetching',
          required: true,
          type: 'string',
        })
        .option('dry-run', {
          description: 'run operation',
          default: true,
          type: 'boolean',
        })
        .option('truncate', {
          description: 'empty destination table during import',
          default: false,
          type: 'boolean',
        })
        .option('limit', {
          description: 'the max number to import (soft limit)',
          default: -1,
          type: 'number',
        })
        .option('throttle', {
          description: 'number of milliseconds to wait before each segment',
          default: 0,
          type: 'number',
        })
        .demandOption('config-file', 'path to configuration file is required');
      // TODO: CREATE yargs.option('throttle-value', {});
    },
    argv => {
      const startTs = Date.now();
      console.log('Starting procedure fetch...');
      return loadConfigFromFile(argv['config-file'], {skipTarget: true})
        .then(config =>
          procedures.copyFromSourceToTemporary(config, {
            dryrun: argv['dry-run'],
            limit: argv.limit === -1 ? null : argv.limit,
            truncate: argv.truncate,
            throttle: argv.throttle,
          })
        )
        .then(() => {
          console.log(
            'Procedure completed in',
            ((Date.now() - startTs) / 1000).toFixed(2),
            'seconds'
          );
        });
    }
  )
  .demandCommand(
    1,
    1,
    'see --usage',
    'only one command can be given at single time'
  )
  .help()
  .alias('help', 'h').argv;
