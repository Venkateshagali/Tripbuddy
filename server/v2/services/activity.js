const db = require("../../db");

const pool = db.promise();

async function insertActivityLog(tripId, actorUserId, entityType, entityId, action, beforeJson, afterJson) {
  await pool.query(
    `INSERT INTO activity_logs
     (trip_id, actor_user_id, entity_type, entity_id, action, before_json, after_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      tripId,
      actorUserId,
      entityType,
      entityId,
      action,
      beforeJson ? JSON.stringify(beforeJson) : null,
      afterJson ? JSON.stringify(afterJson) : null
    ]
  );
}

module.exports = { insertActivityLog };
