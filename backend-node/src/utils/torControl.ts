/**
 * Tor Control Utility - Circuit Rotation for IP Address Changes
 *
 * Based on Python implementation that successfully rotated Tor circuits
 * to get new IP addresses when blocked by Google Scholar.
 *
 * Uses Tor Control Protocol to send SIGNAL NEWNYM command.
 */
import * as net from 'net';
import logger from '../core/logger';

export class TorController {
  private host: string;
  private port: number;
  private socket: net.Socket | null = null;

  constructor(host: string = '127.0.0.1', port: number = 9051) {
    this.host = host;
    this.port = port;
  }

  /**
   * Rotate Tor circuit to get a new IP address
   *
   * This sends a SIGNAL NEWNYM command to Tor, which:
   * 1. Closes existing circuits
   * 2. Establishes new circuits with different exit nodes
   * 3. Results in a new IP address for subsequent requests
   *
   * @returns Promise<boolean> - true if rotation succeeded
   */
  async rotateCircuit(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new net.Socket();

        let responseData = '';

        this.socket.on('data', (data) => {
          responseData += data.toString();
          logger.debug(`Tor Control Response: ${data.toString().trim()}`);

          // Check for authentication success
          if (responseData.includes('250 OK')) {
            const lines = responseData.split('\n');
            const okCount = lines.filter((line) => line.includes('250 OK')).length;

            // We expect 2 "250 OK" responses: one for AUTHENTICATE, one for SIGNAL NEWNYM
            if (okCount >= 2) {
              logger.info('✅ Tor circuit rotated successfully - new IP address active');
              this.socket?.end();
              resolve(true);
            }
          }
        });

        this.socket.on('error', (err) => {
          logger.error(`Tor Control Error: ${err.message}`);
          this.socket?.destroy();
          reject(err);
        });

        this.socket.on('close', () => {
          logger.debug('Tor Control connection closed');
          this.socket = null;
        });

        // Connect to Tor control port
        this.socket.connect(this.port, this.host, () => {
          logger.debug(`Connected to Tor control port ${this.host}:${this.port}`);

          // Authenticate (no password configured)
          this.socket?.write('AUTHENTICATE\r\n');

          // Request new circuit
          setTimeout(() => {
            this.socket?.write('SIGNAL NEWNYM\r\n');
          }, 100);

          // Disconnect after commands sent
          setTimeout(() => {
            if (this.socket) {
              this.socket.end();
            }
          }, 1000);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.socket) {
            logger.warn('Tor circuit rotation timed out');
            this.socket.destroy();
            reject(new Error('Tor control timeout'));
          }
        }, 5000);
      } catch (error) {
        logger.error('Failed to rotate Tor circuit:', error);
        reject(error);
      }
    });
  }

  /**
   * Rotate circuit and wait for it to stabilize
   *
   * @param waitTime - Time to wait after rotation (default: 5 seconds)
   * @returns Promise<boolean>
   */
  async rotateAndWait(waitTime: number = 5000): Promise<boolean> {
    try {
      const success = await this.rotateCircuit();
      if (success) {
        logger.info(`Waiting ${waitTime / 1000}s for new Tor circuit to stabilize...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Tor circuit rotation failed, continuing without rotation');
      return false;
    }
  }

  /**
   * Test current Tor IP address by making a request through the proxy
   *
   * @returns Promise<string> - Current IP address
   */
  async getCurrentIP(): Promise<string> {
    try {
      const axios = require('axios');
      const { SocksProxyAgent } = require('socks-proxy-agent');

      const agent = new SocksProxyAgent('socks5://127.0.0.1:9050');
      const response = await axios.get('https://api.ipify.org?format=json', {
        httpsAgent: agent,
        timeout: 10000,
      });

      return response.data.ip;
    } catch (error) {
      logger.error('Failed to get current Tor IP:', error);
      throw error;
    }
  }

  /**
   * Verify that circuit rotation actually changed the IP
   *
   * @returns Promise<{oldIP: string, newIP: string, changed: boolean}>
   */
  async verifyRotation(): Promise<{ oldIP: string; newIP: string; changed: boolean }> {
    const oldIP = await this.getCurrentIP();
    logger.info(`Current Tor IP: ${oldIP}`);

    await this.rotateAndWait();

    const newIP = await this.getCurrentIP();
    logger.info(`New Tor IP: ${newIP}`);

    const changed = oldIP !== newIP;
    if (changed) {
      logger.info(`✅ IP changed successfully: ${oldIP} → ${newIP}`);
    } else {
      logger.warn(`⚠️  IP did not change: ${oldIP} (Tor may need more time)`);
    }

    return { oldIP, newIP, changed };
  }
}

// Export singleton instance
export const torControl = new TorController();

// Export utility functions
export async function rotateTorCircuit(): Promise<boolean> {
  return torControl.rotateAndWait();
}

export async function verifyTorRotation(): Promise<{
  oldIP: string;
  newIP: string;
  changed: boolean;
}> {
  return torControl.verifyRotation();
}
