import {Argv} from 'yargs';
import {InitialiseArguments} from '../../types';

export default (args: Argv<{}>): Argv<InitialiseArguments> =>
  args
    .option('source-profile', {
      description: 'AWS profile to use for fetching, set empty for localhost',
      alias: 'SP',
      default: 'localhost',
      type: 'string',
    })
    .option('source-region', {
      description: 'AWS region to use for fetching, set empty for localhost',
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
      description: 'AWS profile to use for posting, set empty for localhost',
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
      describe: 'default name for source temporary table used for migration',
      default: 'migrator-temp-source',
      type: 'string',
    })
    .option('local-target-tablename', {
      describe: 'default name for source temporary table used for migration',
      default: 'migrator-temp-target',
      type: 'string',
    })
    .option('use-source-schema', {
      describe: 'if source table schema should be used for target',
      default: false,
      type: 'boolean',
    })
    .demandOption('source-table', 'source table name is required');
