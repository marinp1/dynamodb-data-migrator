import {convertDescriptionToInput, delay} from '../utils';
import {Operations, RegionType} from '../types';

export const deleteAndCreate = async (
  tableOperations: Record<RegionType, ReturnType<Operations>>,
  parameters: {
    source: {region: RegionType; tableName: string};
    target: {region: RegionType; tableName: string};
  }
) => {
  const {source, target} = parameters;

  // Delete table
  await tableOperations[target.region].delete(target.tableName);
  let tableDeleted = false;
  while (!tableDeleted) {
    await delay(500);
    tableDeleted = !(await tableOperations[target.region].exists(
      target.tableName
    ));
  }

  // Get table description & override name in schema
  const tableInput = convertDescriptionToInput(
    await tableOperations[source.region].describe(source.tableName),
    target.tableName
  );

  if (tableInput === null) {
    throw new Error('Table input is null, initialisation failed');
  }

  // Create table
  await tableOperations[target.region].create(tableInput);
  let tableCreated = false;
  while (!tableCreated) {
    await delay(500);
    tableCreated = await tableOperations[target.region].exists(
      target.tableName
    );
  }
};
