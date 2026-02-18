/**
 * Storage Helper
 * Wraps chrome.storage.local for popup data persistence
 */

class StorageHelper {
  /**
   * Get recent contacts from storage
   */
  async getRecentContacts() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['recentContacts'], (result) => {
        resolve(result.recentContacts || []);
      });
    });
  }

  /**
   * Add a contact to recent contacts
   */
  async addRecentContact(contact) {
    const contacts = await this.getRecentContacts();
    
    // Add to beginning, limit to 10 recent contacts
    const updated = [
      { ...contact, importedAt: new Date().toISOString() },
      ...contacts.filter(c => c.linkedin_url !== contact.linkedin_url)
    ].slice(0, 10);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ recentContacts: updated }, () => {
        resolve(updated);
      });
    });
  }

  /**
   * Clear recent contacts
   */
  async clearRecentContacts() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['recentContacts'], () => {
        resolve();
      });
    });
  }

  /**
   * Get stored session
   */
  async getSession() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['session', 'isAuthenticated'], (result) => {
        resolve({
          session: result.session || null,
          isAuthenticated: result.isAuthenticated || false
        });
      });
    });
  }
}

// Make available globally
window.StorageHelper = StorageHelper;
