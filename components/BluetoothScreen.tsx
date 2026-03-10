import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Device } from 'react-native-ble-plx';
import { getBluetoothService, DEVICE_NAME } from '../services/BluetoothService';

export default function BluetoothScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);
  const [deviceData, setDeviceData] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Not connected');
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isSendingCommand, setIsSendingCommand] = useState(false);

  const bluetoothService = getBluetoothService();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      bluetoothService.stopScan();
    };
  }, []);

  const handleScan = async () => {
    setIsScanning(true);
    setStatusMessage('Scanning for Smart Bin Collector...');
    
    await bluetoothService.scanForDevice(
      (device) => {
        console.log('Device found:', device.name);
        setIsScanning(false);
        setStatusMessage('Device found! Connecting...');
        handleConnect(device);
      },
      (error) => {
        console.error('Scan error:', error);
        setIsScanning(false);
        setStatusMessage('Scan failed: ' + error);
        Alert.alert('Scan Error', error);
      }
    );
  };

  const handleConnect = async (device: Device) => {
    const connected = await bluetoothService.connectToDevice(
      device,
      () => {
        // On connected
        console.log('Connected successfully');
        setIsConnected(true);
        setConnectedDevice(device);
        setStatusMessage('Connected to ' + (device.name || device.id));
        
        // Subscribe to data notifications
        bluetoothService.subscribeToData(
          (data) => {
            console.log('Data received:', data);
            setDeviceData(data);
            
            // Parse status updates
            if (data.includes('opened')) {
              setStatusMessage('Bin is OPEN');
            } else if (data.includes('closed')) {
              setStatusMessage('Bin is CLOSED');
            } else {
              setStatusMessage(data);
            }
          },
          (error) => {
            console.error('Data subscription error:', error);
          }
        );
      },
      () => {
        // On disconnected
        console.log('Disconnected');
        setIsConnected(false);
        setConnectedDevice(null);
        setStatusMessage('Disconnected');
        setDeviceData('');
        Alert.alert('Disconnected', 'Device was disconnected');
      },
      (error) => {
        // On error
        console.error('Connection error:', error);
        setStatusMessage('Connection failed: ' + error);
        Alert.alert('Connection Error', error);
      }
    );
  };

  const handleDisconnect = async () => {
    await bluetoothService.disconnect();
    setIsConnected(false);
    setConnectedDevice(null);
    setStatusMessage('Disconnected');
    setDeviceData('');
  };

  const sendCommand = async (command: string, commandName: string) => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to the device first');
      return;
    }

    setIsSendingCommand(true);
    setLastCommand(commandName);
    setStatusMessage(`Sending ${commandName} command...`);

    await bluetoothService.sendCommand(
      command,
      () => {
        console.log(`${commandName} command sent`);
        setIsSendingCommand(false);
        setStatusMessage(`${commandName} command sent successfully`);
      },
      (error) => {
        console.error(`${commandName} command error:`, error);
        setIsSendingCommand(false);
        setStatusMessage(`${commandName} command failed: ` + error);
        Alert.alert('Command Error', error);
      }
    );
  };

  const handleOpenBin = () => sendCommand('OPEN', 'Open');
  const handleCloseBin = () => sendCommand('CLOSE', 'Close');
  const handleGetStatus = () => sendCommand('STATUS', 'Status');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🗑️ Smart Bin Control</Text>
        <Text style={styles.headerSubtitle}>Bluetooth Connection</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Connection Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]} />
            <Text style={styles.statusTitle}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          
          {connectedDevice && (
            <Text style={styles.deviceName}>
              {connectedDevice.name || connectedDevice.id}
            </Text>
          )}
          
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>

        {/* Connection Controls */}
        {!isConnected ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.primaryButton, isScanning && styles.buttonDisabled]}
              onPress={handleScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonIcon}>🔍</Text>
                  <Text style={styles.primaryButtonText}>Scan for Device</Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={styles.helpText}>
              Make sure the Smart Bin Collector is powered on and nearby
            </Text>
          </View>
        ) : (
          <>
            {/* Bin Controls */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bin Controls</Text>
              
              <View style={styles.controlGrid}>
                <TouchableOpacity
                  style={[styles.controlButton, styles.openButton, isSendingCommand && styles.buttonDisabled]}
                  onPress={handleOpenBin}
                  disabled={isSendingCommand}
                >
                  <Text style={styles.controlButtonIcon}>📂</Text>
                  <Text style={styles.controlButtonText}>Open Bin</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, styles.closeButton, isSendingCommand && styles.buttonDisabled]}
                  onPress={handleCloseBin}
                  disabled={isSendingCommand}
                >
                  <Text style={styles.controlButtonIcon}>🔒</Text>
                  <Text style={styles.controlButtonText}>Close Bin</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.statusButton, isSendingCommand && styles.buttonDisabled]}
                onPress={handleGetStatus}
                disabled={isSendingCommand}
              >
                <Text style={styles.statusButtonIcon}>ℹ️</Text>
                <Text style={styles.statusButtonText}>Get Status</Text>
              </TouchableOpacity>
            </View>

            {/* Device Data */}
            {deviceData ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Device Response</Text>
                <View style={styles.dataCard}>
                  <Text style={styles.dataText}>{deviceData}</Text>
                </View>
              </View>
            ) : null}

            {/* Last Command */}
            {lastCommand ? (
              <View style={styles.lastCommandContainer}>
                <Text style={styles.lastCommandLabel}>Last Command:</Text>
                <Text style={styles.lastCommandText}>{lastCommand}</Text>
              </View>
            ) : null}

            {/* Disconnect Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={handleDisconnect}
              >
                <Text style={styles.disconnectButtonText}>Disconnect</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Device Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Device Information</Text>
          <Text style={styles.infoText}>Device Name: {DEVICE_NAME}</Text>
          <Text style={styles.infoText}>
            Connection: {isConnected ? '✅ Active' : '❌ Inactive'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#F44336',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  deviceName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 14,
    color: '#999',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  primaryButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  controlGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#F44336',
  },
  controlButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusButton: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statusButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dataCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  dataText: {
    fontSize: 14,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lastCommandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  lastCommandLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  lastCommandText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  disconnectButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  disconnectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  infoSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginTop: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

