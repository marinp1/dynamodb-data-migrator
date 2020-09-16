import yargs from 'yargs';
import {
  InitialiseArguments,
  FetchArguments,
  TransformArguments,
  MigrationArguments,
} from './types';

const generateBuilderAndHandler = async (
  command: 'initialize' | 'fetch' | 'transform' | 'migrate'
) => ({
  builder: await import(`./commands/${command}/builder.ts`).then(
    res => res.default
  ),
  handler: async (args: unknown) => {
    const startTs = Date.now();
    console.log(`Running command ${command}...`);
    return import(`./commands/${command}/handler.ts`)
      .then(res => res.default(args))
      .then(() => {
        console.log(
          'Command completed in',
          ((Date.now() - startTs) / 1000).toFixed(2),
          'seconds'
        );
      })
      .catch(e => {
        console.error(e);
        console.log('Command failed!');
      });
  },
});

(async () =>
  yargs
    .usage('$0 <command> [args]')
    .command<InitialiseArguments>({
      command: 'initialize',
      aliases: 'init',
      describe: 'initialise migration',
      ...(await generateBuilderAndHandler('initialize')),
    })
    .command<FetchArguments>({
      command: 'fetch',
      describe: 'fetch data',
      ...(await generateBuilderAndHandler('fetch')),
    })
    .command<TransformArguments>({
      command: 'transform',
      describe: 'run transformation from data',
      ...(await generateBuilderAndHandler('transform')),
    })
    .command<MigrationArguments>({
      command: 'migrate',
      describe: 'copy data from local to target',
      ...(await generateBuilderAndHandler('migrate')),
    })
    .demandCommand(
      1,
      1,
      'see --usage',
      'only one command can be given at single time'
    )
    .help()
    .alias('help', 'h').argv)();
