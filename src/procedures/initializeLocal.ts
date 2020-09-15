import {convertDescriptionToInput} from '../utils';
import {Operations, RegionType} from '../types';

export const initializeLocal = async (
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
