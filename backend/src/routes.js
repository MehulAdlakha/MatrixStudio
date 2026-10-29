import express from 'express';
import { store } from './store.js';
import { validateCommand } from './validator.js';

const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'matrix-studio-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/commands
 * Create and queue a new display command (from Frontend)
 */
router.post('/commands', (req, res) => {
  const { type, params } = req.body;

  // Support both { type, params } and { type, ...rest }
  const commandParams = params || req.body;

  const validation = validateCommand(type, commandParams);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  const newCommand = store.setCommand(type, validation.sanitized);

  return res.status(201).json({
    success: true,
    message: `Command "${type}" queued successfully.`,
    command: newCommand
  });
});

/**
 * POST /api/commands/clear
 * Quick convenience endpoint to clear matrix display
 */
router.post('/commands/clear', (req, res) => {
  const command = store.clear();
  return res.status(201).json({
    success: true,
    message: 'Clear command queued.',
    command
  });
});

/**
 * GET /api/commands/current
 * Get current display command and command history (for Frontend)
 */
router.get('/commands/current', (req, res) => {
  res.json({
    success: true,
    command: store.getCurrentCommand(),
    history: store.getCommandHistory()
  });
});

/**
 * DELETE /api/commands/history/:id
 * Remove a single command from activity history
 */
router.delete('/commands/history/:id', (req, res) => {
  const { id } = req.params;
  const result = store.deleteCommandHistory(id);
  res.json({
    success: true,
    message: `History entry ${id} deleted.`,
    ...result
  });
});

/**
 * DELETE /api/commands/history
 * Clear all command activity history
 */
router.delete('/commands/history', (req, res) => {
  store.clearCommandHistory();
  res.json({
    success: true,
    message: 'All command history cleared.'
  });
});

/**
 * GET /api/device/poll
 * Endpoint polled by ESP32 (~500ms) to check for pending unacknowledged commands
 */
router.get('/device/poll', (req, res) => {
  const lastId = req.query.lastId;
  const pending = store.getPendingCommandForDevice(lastId);

  // Automatically update device activity timestamp on every poll
  store.updateDeviceStatus({
    lastSeen: new Date().toISOString(),
    online: true
  });

  res.json({
    success: true,
    ...pending
  });
});

/**
 * POST /api/device/ack
 * ESP32 acknowledges receipt/execution of a command
 */
router.post('/device/ack', (req, res) => {
  const { commandId, status = 'success', message = '' } = req.body;

  if (!commandId || typeof commandId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: commandId'
    });
  }

  const result = store.acknowledgeCommand(commandId, status, message);
  return res.json({
    success: true,
    acknowledged: result.success,
    commandId
  });
});

/**
 * POST /api/device/status
 * ESP32 posts its heartbeat / telemetry data
 */
router.post('/device/status', (req, res) => {
  const { ip, rssi, freeHeap, uptime, currentMode, brightness, fps } = req.body;

  const updated = store.updateDeviceStatus({
    ip: typeof ip === 'string' ? ip : undefined,
    rssi: typeof rssi === 'number' ? rssi : undefined,
    freeHeap: typeof freeHeap === 'number' ? freeHeap : undefined,
    uptime: typeof uptime === 'number' ? uptime : undefined,
    currentMode: typeof currentMode === 'string' ? currentMode : undefined,
    brightness: typeof brightness === 'number' ? brightness : undefined,
    fps: typeof fps === 'number' ? fps : undefined
  });

  return res.json({
    success: true,
    device: updated
  });
});

/**
 * GET /api/device/status
 * Frontend polls this to display real-time ESP32 connection & health
 */
router.get('/device/status', (req, res) => {
  const device = store.getDeviceStatus();
  res.json({
    success: true,
    device
  });
});

export default router;
