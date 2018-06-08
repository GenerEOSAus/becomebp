Eos = require('eosjs') // Eos = require('./src')

process.on('unhandledRejection', error => {
  // Nodejs generic handler
});

genesis = {
  name: 'YOURNAME',
  pubkey: 'YOURKEY',
  privkey: 'YOURPRIVKEY'
}

bp = {
  key: 'BPSIGNKEY',
  name: 'BPNAME',
  url: 'BPURL',
  country: 000, //https://en.wikipedia.org/wiki/ISO_3166-1_numeric
  stake: '1 EOS',
  ram: 8192
}

config = {
  chainId: '7d47aae09c97dbc21d52c6d9f17bb70a1f1f2fda5f81b3ef18979b74b2070d8c', // 32 byte (64 char) hex string
  keyProvider: [genesis.privkey], // WIF string or array of keys..
  httpEndpoint: 'http://dev.cryptolions.io:38888', //probably localhost
  expireInSeconds: 60,
  broadcast: true,
  debug: false, // API and transactions
  sign: true
}

eosClient = Eos(config);

async function findAccounts(pubkey) {
    return await eosClient.getKeyAccounts(pubkey);
}

async function findAccount(name) {
    return await eosClient.getAccount(name);
}

async function createAccount(creator,name,pubkey,stake,ram) {
    return await eosClient.transaction(tr => {
      tr.newaccount({
        creator: creator,
        name: name,
        owner: pubkey,
        active: pubkey
      })
      tr.buyrambytes({
        payer: creator,
        receiver: name,
        bytes: ram
      })
      tr.delegatebw({
        from: creator,
        receiver: name,
        stake_net_quantity: stake,
        stake_cpu_quantity: stake,
        transfer: 1
      })
    });
  }

  async function regProducer(name,key,url,location) {
    return await eosClient.transaction(tr => {
      tr.regproducer({
        producer:name,
        producer_key:key,
        url:url,
        location:location
      })
    });
  }

async function getBps() {
  var params = {
      json: true,
      scope: "eosio",
      code: "eosio",
      table: "producers",
      limit: 500
  }

  return await eosClient.getTableRows(params);
}

async function run() {

  let accounts = await findAccounts(genesis.pubkey);
  let account = false;

  console.log('Accounts we own: ')
  console.log(accounts);

  try {
    account = await findAccount(bp.name);
  } catch(e) {}

  //do we have account and are we bp?
  let we_own = accounts.account_names.includes(bp.name);
  let thief = account ? !we_own : false;

  if(thief) {
    console.log('Someone stole our name! Those bastards!');
    return;
  }

  if(!we_own && !thief) {
    try {
      await createAccount(genesis.name,bp.name,genesis.pubkey,bp.stake,bp.ram);
      console.log('We registered name')
    } catch(e) {}
  } else {
    console.log('Already have name');
  }

  let bps = await getBps();
  let bp_row = bps.rows.find(b => b.owner === bp.name);

  let we_are_bp = bp_row !== undefined;
  let we_are_active = bp_row !== undefined && bp_row.is_active != 0;

  if(!we_are_bp || !we_are_active) {
    try {
      await regProducer(bp.name,bp.key,bp.url,bp.country);
      console.log('We are BP now');
    } catch(e) {}
  } else {
    console.log('Already registered');
  }
}

console.log('Let\'s start!')
run();
setInterval(() => {
  console.log('Are we there yet?');
  run();
},1000*60*2); //run every two minutes
