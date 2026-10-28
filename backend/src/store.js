import crypto from 'crypto';

class MatrixStore {
  constructor() {
    this.currentCommand = null;
    this.deviceStatus = {
      online: false,
      lastSeen: null,
      ip: null,
      rssi: null,
      freeHeap: null,
      uptime: null,
      currentMode: 'idle',
      brightness: 128,
      fps: 0,
      firmwareVersion: '1.0.0'
    };
    this.commandHistory = [];
    this.maxHistory = 30;
    this.deviceTimeoutMs = parseInt(process.env.DEVICE_TIMEOUT_MS || '3500', 10);
  }

  generateCommandId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `cmd_${timestamp}_${random}`;
  }

  setCommand(type, params) {
    const commandId = this.generateCommandId();
    const command = {
      id: commandId,
      type,
      params,
      createdAt: new Date().toISOString(),
      acknowledged: false,
      acknowledgedAt: null
    };

    this.currentCommand = command;

    // Single active effect mode - no queue, instantly replaces current effect
    this.commandHistory = [{
      id: command.id,
      type: command.type,
      summary: this.getCommandSummary(type, params),
      createdAt: command.createdAt,
      acknowledged: false,
      acknowledgedAt: null,
      status: 'active'
    }];

    return command;
  }

  getCommandSummary(type, params) {
    switch (type) {
      case 'text':
        return `Text: "${params.text}" (${params.mode || 'scroll'}, ${params.color})`;
      case 'image':
        return `Image: 30x10 custom frame (${params.pixels ? params.pixels.length : 0} px)`;
      case 'animation':
        return `Animation: ${params.name} (Speed: ${params.speed}ms)`;
      case 'brightness':
        return `Brightness: ${params.value}/255 (${Math.round((params.value / 255) * 100)}%)`;
      case 'clear':
        return 'Clear Display';
      default:
        return `${type} command`;
    }
  }

  getPendingCommandForDevice(lastId) {
    if (this.currentCommand) {
      const isUnacked = !this.currentCommand.acknowledged;
      const isDifferent = lastId && this.currentCommand.id !== lastId;
      return {
        hasCommand: isUnacked || isDifferent || true,
        command: this.currentCommand
      };
    }
    return {
      hasCommand: false,
      currentCommandId: null
    };
  }

  acknowledgeCommand(commandId, status = 'success', message = '') {
    let matched = false;

    if (this.currentCommand && this.currentCommand.id === commandId) {
      this.currentCommand.acknowledged = true;
      this.currentCommand.acknowledgedAt = new Date().toISOString();
      this.currentCommand.ackStatus = status;
      this.currentCommand.ackMessage = message;
      matched = true;
    }

    const historyItem = this.commandHistory.find(item => item.id === commandId);
    if (historyItem) {
      historyItem.acknowledged = true;
      historyItem.acknowledgedAt = new Date().toISOString();
      historyItem.status = status;
      historyItem.message = message;
      matched = true;
    }

    return { success: matched, commandId };
  }

  updateDeviceStatus(data) {
    this.deviceStatus = {
      ...this.deviceStatus,
      ...data,
      lastSeen: new Date().toISOString(),
      online: true
    };
    return this.getDeviceStatus();
  }

  getDeviceStatus() {
    const now = Date.now();
    const lastSeenTime = this.deviceStatus.lastSeen
      ? new Date(this.deviceStatus.lastSeen).getTime()
      : 0;

    const isOnline = lastSeenTime > 0 && (now - lastSeenTime <= this.deviceTimeoutMs);

    return {
      ...this.deviceStatus,
      online: isOnline,
      secondsSinceLastSeen: lastSeenTime > 0 ? Math.round((now - lastSeenTime) / 1000) : null
    };
  }

  getCurrentCommand() {
    return this.currentCommand;
  }

  getCommandHistory() {
    return this.commandHistory;
  }

  clear() {
    return this.setCommand('clear', {});
  }

  deleteCommandHistory(commandId) {
    this.commandHistory = this.commandHistory.filter(item => item.id !== commandId);
    return { success: true, commandId };
  }

  clearCommandHistory() {
    this.commandHistory = [];
    return { success: true };
  }
}

export const store = new MatrixStore();
