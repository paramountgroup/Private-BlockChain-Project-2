/* ===== Udacity Blockchain Developer Project 2 - Private BlockChain =====
| 		Submited by Bod Ingram - bob@theparamountgroup.us                 |
|  ======================================================================*/

/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/
const SHA256 = require('crypto-js/sha256');

/* ===== Persist data with LevelDB ===================================
|  Learn more: level: https://github.com/Level/level     |
|  =============================================================*/

//const levelsandbox = require('./levelsandbox')
const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);




/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block {
    constructor(data) {
        this.hash = "",
            this.height = 0,
            this.body = data,
            this.time = 0,
            this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
    constructor() {
        //verify Genesis block and create if necessary
        this.verifyGenesisBlock();
    }




    async verifyGenesisBlock() {

        const height = await this.getChainHeight();

        if (height === 0) {
            let genesisBlock = new Block("First Block - Genesis Block")
            // UTC timestamp
            genesisBlock.time = new Date().getTime().toString().slice(0, -3);
            // create a Hash
            genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
            // Add to LevelDB

            await addDataToLevelDB(genesisBlock);
        }
    }



    // Add new block to blockchain
    async addBlock(newBlock) {
        // Block height

        newBlock.height = await this.getChainHeight();

        // UTC timestamp

        newBlock.time = new Date().getTime().toString().slice(0, -3);
        // previous block hash
        if (newBlock.height > 0) {
            let prevBlock = await this.getBlock(newBlock.height - 1);

            newBlock.previousBlockHash = prevBlock.hash;

        }
        // Block hash with SHA256 using newBlock and converting to a string
        newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
        // Adding block object to chain

        await addDataToLevelDB(newBlock); // add the new block

    }



    // Find the height of the last block per submission requirements
    getBlockHeight() {
        return new Promise((resolve, reject) => {
            let i = -1;
            // Read the entire blockchain and count the blocks
            db.createReadStream()
                .on('data', data => {
                    i++;
                })
                .on('error', err => reject(err))
                .on('close', () => {
                    resolve(i);
                });
        });
    }
	
	  // Find the number of Blocks in the blockchain
    getChainHeight() {
        return new Promise((resolve, reject) => {
            let i = 0;
            // Read the entire blockchain and count the blocks
            db.createReadStream()
                .on('data', data => {
                    i++;
                })
                .on('error', err => reject(err))
                .on('close', () => {
                    resolve(i);
                });
        });
    }
	
	
    // Return a requested block from the blockchain using blockHeight as the key in the database
    async getBlock(blockHeight) {
        try {
            // wait for requested block to arrive and then return
            return await getLevelDBData(blockHeight);
        } catch (err) {
            console.log(err);
        }
    }


    // validate block
    async validateBlock(key) {
        // get block object
        let block = await this.getBlock(key);
        console.log("validateBlock block #" + key + " block is: " + JSON.stringify(block));
        // get block hash
        let blockHash = block.hash;
        console.log("validateBlock# " + key + " and the hash is: " + blockHash);
        // remove block hash to test block integrity
        block.hash = '';
        // generate block hash
        let validBlockHash = SHA256(JSON.stringify(block)).toString();
        // Compare
        if (blockHash === validBlockHash) {
            console.log("block: " + key + " has valid hash is: " + blockHash);
            return true;
        } else {
            console.log('Block #' + blockHeight + ' invalid hash:\n' + blockHash + '<>' + validBlockHash);
            return false;
        }
    }

    // Validate blockchain
    async validateChain() {
        // save errors in array
        let errorLog = [];
        let blockHeight = await this.getChainHeight();
        console.log("validateChain number of blocks are: " + blockHeight);
        let i = 0;
        do {
            // validate block
            let validBlock = await this.validateBlock(i);

            if (!validBlock) errorLog.push(i);
            // compare blocks hash link
            let block = await this.getBlock(i);

            let blockHash = block.hash;
            let previousBlock = await this.getBlock(i + 1);
            let previousHash = previousBlock.previousBlockHash;
            console.log("in validateChain and blockHash block: " + i + " is: " + blockHash);
            console.log("in validateChain and previousHash for block: " + (i + 1) + " is: " + previousHash);
            i++;
            if (blockHash !== previousHash) {
                errorLog.push(i);
            }
        } while (i < blockHeight - 1);
        //validate last block does not have next block to validate previous hash
        let validBlock = await this.validateBlock(i);
        if (!validBlock) errorLog.push(i);
		// if errors detected send to console
        if (errorLog.length > 0) {
            console.log('Block errors = ' + errorLog.length);
            console.log('Blocks: ' + errorLog);
        } else {
            console.log('No errors detected');
        }
    }


}
/*============================================================================================
* getLevelDBData returns the requested block object using blockheight as the key for lookup
=============================================================================================*/

function getLevelDBData(key) {
    return new Promise((resolve, reject) => {
        db.get(key, function (err, value) {
            if (err) {
                console.log("Not found!", err);
                reject(err);
            } else {
                resolve(JSON.parse(value));
            }
        });
    });
}

/*=============================================================
// Add data to levelDB with key/value pair
===============================================================*/

function addLevelDBData(key, value) {
    //place new block in Level db using blockHeight as key and JSON.stringify the block object
    db.put(key, JSON.stringify(value), function (err) {


        if (err) return console.log('Block ' + key + ' submission failed', err);
    });
}


/*============================================================
// addDataToLevelDB will Add block object 'value' to levelDB 
=============================================================*/

function addDataToLevelDB(value) {
    //Determine blockHeight and add next block
    let i = 0;
    db.createReadStream().on('data', function (data) {
        i++;
    }).on('error', function (err) {
        return console.log('Unable to read data stream!', err);
    }).on('close', function () {
        addLevelDBData(i, value);
    });
}

// Create blockchain for testing
let testBlockChain = new Blockchain();

// Loop 3 times creating blocks and then validate the chain
(function theLoop(i) {
    setTimeout(function () {
        console.log("create block in the loop for testing block #: " + i);
        let blockTest = new Block("Test Block - " + (i + 1));
        testBlockChain.addBlock(blockTest);
        i++;
        if (i < 3) {
            theLoop(i)
        } else {
            testBlockChain.validateChain();
        }
    }, 10000);
})(0);
