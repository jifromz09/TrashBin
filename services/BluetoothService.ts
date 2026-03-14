import { BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';

// UUIDs from the embedded device configuration
export const SERVICE_UUID = '19B10000-E8F2-537E-4F6C-D104768A1214';
export const DATA_CHARACTERISTIC_UUID = '19B10001-E8F2-537E-4F6C-D104768A1214';
export const COMMAND_CHARACTERISTIC_UUID = '19B10002-E8F2-537E-4F6C-D104768A1214';
export const DEVICE_NAME = 'Smart Bin Collector';

// Commands
export const CMD_OPEN = 'OPEN';
export const CMD_CLOSE = 'CLOSE';
export const CMD_STATUS = 'STATUS';

export interface BinStatus {
  isOpen: boolean;
  lastCommand: string;
  timestamp: number;
}

export class BluetoothService {
  private manager: BleManager;
  private device: Device | null = null;
  private isScanning: boolean = false;
  private dataSubscription: any = null;

  constructor() {
    this.manager = new BleManager();
  }

  // Request Bluetooth permissions (Android 12+)
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        
        return (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    } else if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('Permission request error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  }

  // Check if Bluetooth is powered on
  async isBluetoothEnabled(): Promise<boolean> {
    const state = await this.manager.state();
    return state === State.PoweredOn;
  }

  // Scan for Smart Bin Collector device
  async scanForDevice(
    onDeviceFound: (device: Device) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (this.isScanning) {
      console.log('Already scanning...');
      return;
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      onError?.('Bluetooth permissions not granted');
      return;
    }

    const isEnabled = await this.isBluetoothEnabled();
    if (!isEnabled) {
      onError?.('Bluetooth is not enabled');
      return;
    }

    console.log('Starting BLE scan for Smart Bin Collector...');
    this.isScanning = true;

    this.manager.startDeviceScan(
      [SERVICE_UUID], // Filter by service UUID
      null,
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          this.isScanning = false;
          onError?.(error.message);
          return;
        }

        if (device) {
          console.log('Found device:', device.name, device.id);
          
          // Check if this is our Smart Bin Collector device
          if (device.name === DEVICE_NAME || device.localName === DEVICE_NAME) {
            console.log('Smart Bin Collector found!');
            this.stopScan();
            onDeviceFound(device);
          }
        }
      }
    );

    // Stop scanning after 30 seconds if device not found
    setTimeout(() => {
      if (this.isScanning) {
        this.stopScan();
        onError?.('Device not found. Make sure the Smart Bin is powered on and nearby.');
      }
    }, 30000);
  }

  // Stop scanning
  stopScan(): void {
    if (this.isScanning) {
      console.log('Stopping BLE scan...');
      this.manager.stopDeviceScan();
      this.isScanning = false;
    }
  }

  // Connect to device
  async connectToDevice(
    device: Device,
    onConnected?: () => void,
    onDisconnected?: () => void,
    onError?: (error: string) => void
  ): Promise<boolean> {
    try {
      console.log('Connecting to device:', device.name);
      
      // Connect to device
      this.device = await device.connect();
      console.log('Connected to device');

      // Discover services and characteristics
      if (this.device) {
        await this.device.discoverAllServicesAndCharacteristics();
      }
      console.log('Services and characteristics discovered');

      // Monitor connection state
      this.device?.onDisconnected((error, disconnectedDevice) => {
        console.log('Device disconnected:', disconnectedDevice?.name);
        if (error) {
          console.error('Disconnection error:', error);
        }
        this.device = null;
        this.dataSubscription?.remove();
        this.dataSubscription = null;
        onDisconnected?.();
      });

      onConnected?.();
      return true;
    } catch (error: any) {
      console.error('Connection error:', error);
      this.device = null;
      onError?.(error.message || 'Failed to connect to device');
      return false;
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.cancelConnection();
        console.log('Disconnected from device');
      } catch (error) {
        console.error('Disconnect error:', error);
      }
      this.device = null;
      this.dataSubscription?.remove();
      this.dataSubscription = null;
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.device !== null;
  }

  // Subscribe to data notifications from device
  async subscribeToData(
    onDataReceived: (data: string) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (!this.device) {
      onError?.('Not connected to device');
      return;
    }

    try {
      if (!this.device) {
        const msg = 'Device not connected, cannot subscribe';
        console.error(msg);
        onError?.(msg);
        return;
      }

      console.log('Subscribing to data characteristic...');
      
      this.dataSubscription = this.device.monitorCharacteristicForService(
        SERVICE_UUID,
        DATA_CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            const errMsg = error?.message || JSON.stringify(error || 'Unknown error');
            console.error('Monitoring error:', errMsg);
            onError?.(errMsg);
            return;
          }

          if (!characteristic) {
            const errMsg = 'Monitoring error: characteristic is null';
            console.error(errMsg);
            onError?.(errMsg);
            return;
          }

          if (!characteristic.value) {
            console.log('Monitoring callback: no value yet');
            return;
          }

          // Decode base64 value
          const data = Buffer.from(characteristic.value, 'base64').toString('utf-8');
          console.log('Received data:', data);
          onDataReceived(data);
        }
      );
      
      console.log('Subscribed to data notifications');
    } catch (error: any) {
      const errMsg = error?.message || JSON.stringify(error || 'Failed to subscribe to notifications');
      console.error('Subscribe error:', errMsg);
      onError?.(errMsg);
    }
  }

  // Send command to device
  async sendCommand(
    command: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (!this.device) {
      onError?.('Not connected to device');
      return;
    }

    try {
      if (!command || command.trim().length === 0) {
        onError?.('Command is empty');
        return;
      }
      const trimmed = command.trim();
      // Encode command to base64
      const commandUpper = trimmed.toUpperCase();
      const encodedCommand = Buffer.from(commandUpper, 'utf-8').toString('base64');
      
      console.log('Sending command:', commandUpper, 'encoded:', encodedCommand);
      
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        COMMAND_CHARACTERISTIC_UUID,
        encodedCommand
      );
      
      console.log('Command sent successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Send command error:', error);
      onError?.(error.message || 'Failed to send command');
    }
  }

  // Open bin
  async openBin(
    onSuccess?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    await this.sendCommand(CMD_OPEN, onSuccess, onError);
  }

  // Close bin
  async closeBin(
    onSuccess?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    await this.sendCommand(CMD_CLOSE, onSuccess, onError);
  }

  // Get status
  async getStatus(
    onSuccess?: () => void,
    onError?: (error: string) => void
  ): Promise<void> {
    await this.sendCommand(CMD_STATUS, onSuccess, onError);
  }

  // Cleanup
  destroy(): void {
    this.stopScan();
    this.disconnect();
    this.dataSubscription?.remove();
    this.dataSubscription = null;
  }
}

// Singleton instance
let bluetoothServiceInstance: BluetoothService | null = null;

export const getBluetoothService = (): BluetoothService => {
  if (!bluetoothServiceInstance) {
    bluetoothServiceInstance = new BluetoothService();
  }
  return bluetoothServiceInstance;
};

