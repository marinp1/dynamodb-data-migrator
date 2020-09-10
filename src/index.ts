import yargs from 'yargs';
import * as procedures from './procedures';

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
}

/*
yargs.command('fetch', 'fetch data', yargs => {
  yargs
    .option('config-file', {
      description: 'configuration file to use for fetching',
      required: true,
      type: 'string',
    })
    .option('no-dry-run', {
      description: 'run operation',
      default: false,
      type: 'boolean',
    });
  // TODO: CREATE yargs.option('throttle-value', {});
});
*/

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
        .demandOption('source-table', 'source table name is required')
        .help()
        .alias('help', 'h').argv;
    },
    argv => {
      const startTs = Date.now();
      console.log('Starting procedure initialize...');
      return procedures
        .initialiseTables({
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
        })
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
