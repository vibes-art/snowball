var DEBUG_BLOBS = true;

class XBlobStorage {

  constructor (opts) {
    opts = opts || {};

    this.name = opts.name || 'XBlobStorage';
    this.version = opts.version || 1;

    this.database = null;
    this.isInitialized = false;
  }

  initialize () {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) return resolve();

      DEBUG_BLOBS && console.log(`~~~ BLOBS: initializing ...`);
      var openRequest = indexedDB.open(this.name, this.version);

      openRequest.onupgradeneeded = (e) => {
        DEBUG_BLOBS && console.log(`~~~ BLOBS: onupgradeneeded ...`);

        var db = e.target.result;
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs');
          DEBUG_BLOBS && console.log(`~~~ BLOBS: createObjectStore ...`);
        }
      };

      openRequest.onsuccess = (e) => {
        DEBUG_BLOBS && console.log(`~~~ BLOBS: initialize success ...`);
        this.database = e.target.result;
        this.isInitialized = true;
        resolve();
      };

      openRequest.onerror = (e) => {
        DEBUG_BLOBS && console.log(`~~~ BLOBS: initialize failed ...`);
        console.error('Error opening db', e);
        reject(e);
      };
    });
  }

  storeBlob (blob, blobKey, attempts) {
    if (!this.isInitialized) {
      return this.initialize().then(() => this.storeBlob(blob, blobKey, attempts));
    }

    attempts = attempts || 1;

    return new Promise((resolve, reject) => {
      if (attempts >= 10) {
        return reject(`Exceeded storeBlob attempts limit!`);
      };

      DEBUG_BLOBS && console.log(`~~~ BLOBS: store attempt ${attempts} of ${blobKey} ...`);

      var transaction = this.database.transaction(['blobs'], 'readwrite');
      var store = transaction.objectStore('blobs');
      var request = store.put(blob, blobKey);

      request.onsuccess = (e) => {
        DEBUG_BLOBS && console.log(`~~~ BLOBS: store success ${blobKey} ...`);
        resolve();
      };
  
      request.onerror = (e) => {
        DEBUG_BLOBS && console.log(`~~~ BLOBS: store error ${blobKey} ...`);
        console.error('Error storing blob', e);
        setTimeout(() => resolve(this.storeBlob(blob, blobKey, attempts + 1)), attempts * 1000);
      };
    });
  }

  retrieveBlob (blobKey, attempts) {
    if (!this.isInitialized) {
      return this.initialize().then(() => this.retrieveBlob(blobKey, attempts));
    }

    attempts = attempts || 1;

    return new Promise((resolve, reject) => {
      if (attempts >= 10) {
        return reject(`Exceeded retrieveBlob attempts limit!`);
      };

      DEBUG_BLOBS && console.log(`~~~ BLOBS: retrieve attempt ${attempts} of ${blobKey} ...`);

      var transaction = this.database.transaction(['blobs'], 'readonly');
      var store = transaction.objectStore('blobs');
      var request = store.get(blobKey);

      request.onsuccess = (e) => {
        DEBUG_BLOBS && console.log(`~~~ BLOBS: retrieve success ${blobKey} ...`);
        resolve(request.result);
      };

      request.onerror = (e) => {
        DEBUG_BLOBS && console.log(`~~~ BLOBS: retrieve error ${blobKey} ...`);
        console.error('Error retrieving blob', e);
        setTimeout(() => resolve(this.retrieveBlob(blobKey, attempts + 1)), attempts * 1000);
      };
    });
  }

}
