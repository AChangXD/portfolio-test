import { PortfolioDatabase } from "./PortfolioDatabase";
import { MigrationState } from "./MigrationState";
import { Migration } from "./Migration";
import { Migration as MigrationDocument } from "./schemas/Migration";

import { readdir } from "fs/promises";

const MIGRATIONS_DIRECTORY = __dirname + "/migrations/";

export class MigrationStateRepository {
  constructor(private db: PortfolioDatabase) {}

  public async find(): Promise<MigrationState> {
    const migrations_file_names = await readdir(MIGRATIONS_DIRECTORY);

    const migrations = migrations_file_names.map((migration_file_name) => {
      return new Migration(
        migration_file_name,
        `${MIGRATIONS_DIRECTORY}${migration_file_name}`,
      );
    });

    const latest_migration = await this.db.migrations
      .find()
      .sort({ file_created_at: -1 })
      .limit(1)
      .toArray();

    if (latest_migration.length === 0) {
      return new MigrationState(migrations);
    }

    return new MigrationState(migrations, latest_migration[0].name);
  }

  public async save(migration_state: MigrationState): Promise<void> {
    const ran_migrations = migration_state.newly_ran_migrations;

    if (ran_migrations.length != 0) {
      const migration_documents: MigrationDocument[] = ran_migrations.map(
        (migration: Migration) => ({
          name: migration.id,
          file_created_at: migration.date,
        }),
      );

      await this.db.migrations.insertMany(migration_documents);
    }
  }
}
