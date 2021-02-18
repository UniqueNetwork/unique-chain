# Hackusama Walk-Through Demo

This document walks through all Hackusama deliverables made in relation to NFT Blockchain submission.

## Updates to NFT Parachain

[Project Description](https://github.com/usetech-llc/nft_unity/blob/master/README.md)

### Deployed NFT TestNet

The TestNet public node is avaiable at wss://unique.usetech.com. It is easy to verify that it functions with the
standard AppsUI:

1. Open the [Apps UI](https://polkadot.js.org/apps/#)
2. Click on the network icon in the top left corner
3. Scroll down the list and input `wss://unique.usetech.com` under "custom endpoint"
4. After connection is established, copy these
   [UI Custom Types](https://github.com/usetech-llc/nft_parachain#ui-custom-types) and paste them in
   [Developer Settings](https://polkadot.js.org/apps/#/settings/developer). Hit "Save" button.
5. Now the NFT node is connected with AppsUI.
6. Go to [Chain State](https://polkadot.js.org/apps/#/chainstate) and verify that NFT pallet is visible and you can read
   information from it.
7. For example, select nft -> collection, and enter collection ID 4 (for SubstraPunks) and click "+" button. You will
   see the collection properties such as UTF-16 encoded collection name and description, UTF-8 encoded token prefix, the
   size of custom data, etc.

#### Getting some Unique Tokens

1. Install Polkadot{.js} extension if you don't have it already installed. Here are the links for
   [Chrome](https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopnmbcafieddcagagdcbnhejhlodfdd) and
   [Firefox](https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/) extensions.
2. Create an address
3. Contact us at [Unique Network Telegram channel](https://t.me/joinchat/DPVt1RwN50Uic_Q9lFcg9A) in order to get some
   Unique token and some Re-Fungible tokens. Faucet is comming soon, we will update this instructions when it goes live.

### Smart Contracts Pallet

1. Open [Contracts](https://polkadot.js.org/apps/#/contracts) tab. It only appears in the UI when Smart Contracts pallet
   is included in the runtime.
2. Additionally, we can find an existing smart contract. Click on "Add an existing contract" link.
3. Input this contract address: `5GdNqKMv4Sszq3SRd3TkXNa6a9ct4D3nXvtTWTFR7rTyccVJ`
4. Input any contract name, for example `Claim Substrapunks`
5. Download and drag-and-drop this
   [metadata.json](https://github.com/usetech-llc/substrapunks/releases/download/v1.0.2/metadata.json) file into
   contract ABI field.
6. Click Save. The contract appears in the page. If the contract did not exist at that address, the UI would display an
   error message: "Unable to find deployed contract code at the specified address".

### Integration Between Smart Contracts and NFT Pallet

This was one of the most challenging parts of the Hackusama for us. The pre-RC4 versions of Substrate did not function
properly when we tried to use `ext_dispatch_call` to dispatch a runtime call to NFT pallet from Contracts pallet, and
RC4 had the `ext_dispatch_call` already removed to "free space" for some friendlier way of interaction between pallets,
that was not yet implemented. Thanks to Alexander Theißen who reverted the removal of `ext_dispatch_call` and created a
special branch based on RC4 for us!

The smart contract source code exists in this
[repository folder](https://github.com/usetech-llc/nft_parachain/tree/master/smart_contract/ink-types-node-runtime), but
the best way to test how the interaction between smart contracts and NFT pallet works is to see it in action using the
[SubstraPunks Game Example](https://ipfs-gateway.usetech.com/ipns/QmaMtDqE9nhMX9RQLTpaCboqg7bqkb6Gi67iCKMe8NDpCE/) that
uses smart contract to claim free characters. The complete demo of this game will come later, so please bare with us and
let's put this item demonstration for a bit later.

### Re-Fungibility support

This feature is best demonstrated in action using our NFT wallet. First, you need to have some Unique and Re-Fungible
tokens. [This section](#getting-some-unique-tokens) tells how to get them.

1. Open the [NFT Wallet](https://uniqueapps.usetech.com/#/nft)
2. Search for collection called "Artwork". Search can be done either by collection name or collection ID (which is 2).
3. Click on "+ Add collection" in search results. The collection will appear under "My collections"
4. Expand the "Artwork" collection and see that you own a token with a partial balance
5. Transfer the token to some other address: Click "Transfer token" and enter address and the amount. Amount should be
   entered as decimal fraction. For example "0.01" to transfer 1/100th part of the token.
6. Observe that your balance decreased by the amount you entered.

#### The Hard Way

Also, the Re-Fungible support can be demonstrated using the standard UI features without NFT wallet.

1. Open [Chain State](https://uniqueapps.usetech.com/#/chainstate).
2. Select "nft" - "reFungbleItemList"
3. Enter parameters: 2 and 1, click "+" button
4. Observe the following data structure returned:

```
{
  Collection: 2,
  Owner: [
    {
      owner: 5FNujvbtMyKoJC2zTrfGVaQek7jhfR1L558BMhogfFfD7veH,
      fraction: 3,000
    },
    {
      owner: 5D73wtH5pqN99auP4b6KQRQAbketaSj4StkBJxACPBUAUdiq,
      fraction: 3,000
    },
    {
      owner: 5FZeTmbZQZsJcyEevjGVK1HHkcKfWBYxWpbgEffQ2M1SqAnP,
      fraction: 2,000
    },
    {
      owner: 5EnzEXBuxFHdymceAAtstym8FETQqH4inx29XJSP6uHaCUiP,
      fraction: 1,000
    },
    {
      owner: 5GU6iHnc3qTMaufmKYzHUpDmVN2CgzA2JMcGFQLcKNDbE7c6,
      fraction: 1,000
    }
  ],
  Data:
}
```

The Owner field contains a list of owners with the fractions they own. The fractions are represented as fixed point
decimals. The number of decimal points in this fraction is determined by collection properties. For example, in the
Artwork collection this property is equal to 4. The owned fraction is then determined as `fraction` divided by
10^DecimalPoints, i.e. 10,000 in this case.

5. Staying in Chain State, select "nft" - "colection"
6. Input "2" and click "+"
7. Observe the following structure returned. It tells that collection is ReFungible and DecimalPoints field is equal
   to 4.

```
{
  Owner: 5FNujvbtMyKoJC2zTrfGVaQek7jhfR1L558BMhogfFfD7veH,
  Mode: {
    ReFungible: [
      0,
      4
    ]
  },
  Access: 0,
  DecimalPoints: 4,
  Name: [
...
```

### Off-Chain Schema to store token image URLs

This feature is best demonstrated in action using our NFT wallet. First, you need to have some Unique and Re-Fungible
tokens. [This section](#getting-some-unique-tokens) tells how to get them.

1. Open the [NFT Wallet](https://uniqueapps.usetech.com/#/nft)
2. Search for collection called "Artwork". Search can be done either by collection name or collection ID (which is 2).
3. Expand "Artwork" collection
4. Click on the image to zoom in.
5. Right-click on the image and select "Open Image in New Tab"
6. Note the image URL:

```
https://ipfs-gateway.usetech.com/ipfs/QmUSv64cUmL2m44QYkUFWmH89qykC8VLPFwjhpeAScjejS/image1.jpg
```

7. Open [Chain State](https://uniqueapps.usetech.com/#/chainstate).
8. Select "nft" - "colection"
9. Input "2" and click "+"
10. Scroll down:

```
  ],
  TokenPrefix: ARTu0000,
  CustomDataSize: 0,
  OffchainSchema: https://ipfs-gateway.usetech.com/ipfs/QmUSv64cUmL2m44QYkUFWmH89qykC8VLPFwjhpeAScjejS/image{id}.jpg,
  Sponsor: 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM,
  UnconfirmedSponsor: 5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM
}
```

11. Observe the field called `OffchainSchema`. This field defines the URL schema that is used to contruct token URLs
    based on the token ID. In this particular example, the {id} template variable is replaced with token id 1, which
    results in the proper image URL.

### New economic models

This feature is best demonstrated when you own a SubstraPunk character. Please proceed with the demonstration, and then
come back after you claim one.

1. Create a new address in Polkadot{.js} extension. We need an address that has zero balance in Unique tokens. Let's
   call it "ZERO BALANCE" address.
2. Open the [NFT Wallet](https://uniqueapps.usetech.com/#/nft)
3. Search for collection called "SubstraPunks" (partial search also works, so you can just type "punk" and hit Enter)
4. Add collection
5. Expand substrapunks collection and transfer your PNK token to your "ZERO BALANCE" address.
6. Now select your "ZERO BALANCE" address in the drop-down list and repeat searching and adding the collection for this
   address.
7. Transfer token back to your main address. Observe that despite the zero balance, the transfer is successful.

### White Lists and Public Mint Permission

We did not complete these features in time by Hackusama deadline, but because they are important for security of the
network, we completed them after the deadline anyway. They can be seen in branch
[feature/white_list](https://github.com/usetech-llc/nft_parachain/tree/feature/white_list). Here are the permalinks to
essential functions:

[white_lists](https://github.com/usetech-llc/nft_parachain/blob/b7c59f0085ed2bc1922e937adf68ef4174a8ba36/pallets/nft/src/lib.rs#L659)

[mint_permission](https://github.com/usetech-llc/nft_parachain/blob/b7c59f0085ed2bc1922e937adf68ef4174a8ba36/pallets/nft/src/lib.rs#L373)

## NFT Wallet

[Project Description](https://github.com/usetech-llc/apps/blob/master/README.md)

All features of the NFT Wallet were already demonstrated previously:

-   Enables adding favorite collections
-   Shows tokens owned
-   Allows NFT and Re-Fungible transfers
-   Shows Re-Fungible Balances
-   Shows Token Images

## Our version of AppsUI

The UI was also mainly demonstrated. We only need to show some configuration that happens behind the scenes:

### Loads appropriate custom API types

1. Open the [NFT Wallet Developer Settings](https://uniqueapps.usetech.com/#/settings/developer)
2. Observe that Custom UI types are already in place

### Defaults to NFT TestNet

1. Open the [NFT Wallet](https://uniqueapps.usetech.com/)
2. Observe that Unique Network icon appears in the left top corner without a need to specify the network
3. Click on Unique Network icon and see that `NFT Testnet` is in the network list

## Unity API and SDK PoC

[Project Description](https://github.com/usetech-llc/nft_unity/blob/master/README.md)

In order to see Unity Asset in action, please follow the instructions in this README file:

[Demonstration](https://github.com/usetech-llc/nft_unity/blob/master/src/DemoApplication/readme.md)

## SubstraPunks Game

[Project Description](https://github.com/usetech-llc/substrapunks/blob/master/README.md)

First, you will need some Unique balance. [This section](#getting-some-unique-tokens) tells how to get the TestNet
currency.

1. Open this [SubstraPunks Game](https://ipfs-gateway.usetech.com/ipns/QmaMtDqE9nhMX9RQLTpaCboqg7bqkb6Gi67iCKMe8NDpCE/)
   IPFS link
2. Find a character you like that still has red background. Red indicates that the character was not yet claimed by
   anyone.
3. Allow access for Polkadot{.js} to this site
4. Click "Claim" button
5. Select the account that has some Unique balance
6. Click "Claim" again, sign transaction, and wait until it mines.

Let's make a pause here: You were just demonstrated how the integration between smart contracts and NFT Pallet works.
This is what we've been previously talking about [here](#integration-between-smart-contracts-and-nft-pallet)

The source code of the generic smart contract is located in
[smart_contract](https://github.com/usetech-llc/nft_parachain/tree/dev/smart_contract/ink-types-node-runtime) folder.
But to demonstrate smart contracts in practice we created additional
[Claim Contract](https://github.com/usetech-llc/substrapunks/tree/master/smart_contract) to implement claiming
functionality in this game.

Here is how Claiming works: Claim Contract owns all characters in the game initially. Player sends a transaction calling
the method claim:

```
fn claim(&mut self, collection_id: u64, item_id: u64, new_owner: AccountId)
```

Inside the method `claim` there is a call made to NFT pallet to transfer the token that is being claimed to the player:

```
runtime_calls::transfer(collection_id, item_id, new_owner);
```

7. Follow the link to [NFT Wallet](https://uniqueapps.usetech.com/#/nft)
8. Search for "SubstraPunks" collection, add it
9. Expand the collection and find your character in there!
10. Now you can try transfers and test the [economic model](#new-economic-models), the last thing we put off until a
    SubstraPunks character is claimed.
