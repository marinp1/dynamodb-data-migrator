import {Arguments} from 'yargs';
import procedures from '../../procedures';
import tableOperations from '../../operations';
import {loadConfigFromFile} from '../../config';
import {MigrationArguments} from '../../types';

export default (argv: Arguments<MigrationArguments>) => {
  return loadConfigFromFile(argv['config-file']).then(config => {
    if (!config.target || !config.target.tableName) {
      throw new Error('Invalid configuration!');
    }

    return tableOperations(config).then(operations =>
      (argv['create-table']
        ? procedures.deleteAndCreate(operations, {
            source: {
              region: 'local',
              tableName: config.localConfig.targetTableName,
            },
            target: {
              region: 'target',
              tableName: config.target?.tableName as string,
            },
          })
        : Promise.resolve()
      ).then(() =>
        procedures.migrateAndTransform(
          operations,
          {
            source: {
              region: 'local',
              tableName: config.localConfig.targetTableName,
            },
            target: {
              region: 'target',
              tableName: config.target?.tableName as string,
            },
          },
          {
            dryrun: argv['dry-run'],
            throttle: argv.throttle,
          }
        )
      )
    );
  });
};
