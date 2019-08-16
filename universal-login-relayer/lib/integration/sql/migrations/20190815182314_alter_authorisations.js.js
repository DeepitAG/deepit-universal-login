/*
  THIS IS A MIGRATION
  This file SHOULD NOT be RENAMED or CHANGED in ANY WAY!
  If you need to change the database schema create a new migration.
*/
exports.up = async (knex) => {
  await knex.schema.alterTable('authorisations', (table) => {
    table.string('chain', 30);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('authorisations', (table) => {
    table.dropColumn('chain');
  });
};