/*
  THIS IS A MIGRATION
  This file SHOULD NOT be RENAMED or CHANGED in ANY WAY!
  If you need to change the database schema create a new migration.
*/
exports.up = async (knex) => {
  await knex.schema.alterTable('signature_key_pairs', (table) => {
    table.string('network', 30);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('signature_key_pairs', (table) => {
    table.dropColumn('network');
  });
};
