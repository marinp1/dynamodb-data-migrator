import yargs from 'yargs';
import {InitialiseArguments, FetchArguments, TransformArguments} from './types';

/*
yargs.command('migrate', 'post data', yargs => {
  yargs.option('config-file', {});
  yargs.option('no-dry-run', {});
  yargs.option('throttle-value', {});
});
*/

const generateBuilderAndHandler = async (
  command: 'initialize' | 'fetch' | 'transform'
) => ({
  builder: await import(`./commands/${command}/builder`).then(
    res => res.default
  ),
  handler: async (args: unknown) => {
    const startTs = Date.now();
    console.log(`Running command ${command}...`);
    return import(`./commands/${command}/handler`)
      .then(res => res.default(args))
      .then(() => {
        console.log(
          'Procedure completed in',
          ((Date.now() - startTs) / 1000).toFixed(2),
          'seconds'
        );
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
    .demandCommand(
      1,
      1,
      'see --usage',
      'only one command can be given at single time'
    )
    .help()
    .alias('help', 'h').argv)();
