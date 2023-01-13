// Copyright 2019-2022 Unique Network (Gibraltar) Ltd.
// This file is part of Unique Network.

// Unique Network is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Unique Network is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Unique Network. If not, see <http://www.gnu.org/licenses/>.

import {expect, itEth, usingEthPlaygrounds} from './util';
import {IKeyringPair} from '@polkadot/types/types';
import {COLLECTION_HELPER, CONTRACT_HELPER} from '../util';

describe('RPC eth_getCode', () => {
  let donor: IKeyringPair;

  before(async function() {
    await usingEthPlaygrounds(async (helper, privateKey) => {
      donor = await privateKey({filename: __filename});
    });
  });

  [
<<<<<<< HEAD
    {address: COLLECTION_HELPER},
    {address: CONTRACT_HELPER},
=======
    {address: COLLECTION_HELPER, expectedCode: '0x60e0604052602660808181529061073160a03960019061001f90826100d1565b5034801561002c57600080fd5b50610190565b634e487b7160e01b600052604160045260246000fd5b600181811c9082168061005c57607f821691505b60208210810361007c57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156100cc57600081815260208120601f850160051c810160208610156100a95750805b601f850160051c820191505b818110156100c8578281556001016100b5565b5050505b505050565b81516001600160401b038111156100ea576100ea610032565b6100fe816100f88454610048565b84610082565b602080601f831160018114610133576000841561011b5750858301515b600019600386901b1c1916600185901b1785556100c8565b600085815260208120601f198616915b8281101561016257888601518255948401946001909101908401610143565b50858210156101805787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b6105928061019f6000396000f3fe6080604052600436106100915760003560e01c80638562425811610059578063856242581461013c578063ab1734501461012e578063b5cb749814610157578063c3de149414610187578063d23a7ab1146101a257600080fd5b806301ffc9a7146100965780632e716683146100cb578063564e321f146100fe5780637335b79f14610120578063844af6581461012e575b600080fd5b3480156100a257600080fd5b506100b66100b1366004610206565b6101c5565b60405190151581526020015b60405180910390f35b3480156100d757600080fd5b506100e66100b1366004610237565b6040516001600160a01b0390911681526020016100c2565b34801561010a57600080fd5b5061011e610119366004610279565b6101eb565b005b6100e66100b1366004610337565b6100e66100b13660046103da565b34801561014857600080fd5b5061011e610119366004610462565b34801561016357600080fd5b506101726100b1366004610279565b60405163ffffffff90911681526020016100c2565b34801561019357600080fd5b506100b66100b1366004610279565b3480156101ae57600080fd5b506101b76101c5565b6040519081526020016100c2565b6000600160405162461bcd60e51b81526004016101e291906104b0565b60405180910390fd5b600160405162461bcd60e51b81526004016101e291906104b0565b60006020828403121561021857600080fd5b81356001600160e01b03198116811461023057600080fd5b9392505050565b60006020828403121561024957600080fd5b813563ffffffff8116811461023057600080fd5b80356001600160a01b038116811461027457600080fd5b919050565b60006020828403121561028b57600080fd5b6102308261025d565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126102bb57600080fd5b813567ffffffffffffffff808211156102d6576102d6610294565b604051601f8301601f19908116603f011681019082821181831017156102fe576102fe610294565b8160405283815286602085880101111561031757600080fd5b836020870160208301376000602085830101528094505050505092915050565b6000806000806080858703121561034d57600080fd5b843567ffffffffffffffff8082111561036557600080fd5b610371888389016102aa565b95506020870135915060ff8216821461038957600080fd5b9093506040860135908082111561039f57600080fd5b6103ab888389016102aa565b935060608701359150808211156103c157600080fd5b506103ce878288016102aa565b91505092959194509250565b6000806000606084860312156103ef57600080fd5b833567ffffffffffffffff8082111561040757600080fd5b610413878388016102aa565b9450602086013591508082111561042957600080fd5b610435878388016102aa565b9350604086013591508082111561044b57600080fd5b50610458868287016102aa565b9150509250925092565b6000806040838503121561047557600080fd5b61047e8361025d565b9150602083013567ffffffffffffffff81111561049a57600080fd5b6104a6858286016102aa565b9150509250929050565b600060208083526000845481600182811c9150808316806104d257607f831692505b85831081036104ef57634e487b7160e01b85526022600452602485fd5b87860183815260200181801561050c57600181146105225761054d565b60ff198616825284151560051b8201965061054d565b60008b81526020902060005b868110156105475781548482015290850190890161052e565b83019750505b5094999850505050505050505056fea2646970667358221220a43ca09fe677b7ab611be4b7ea2ed7e656ade53b3d1252c653ff4a84b36d3c3064736f6c634300081000337468697320636f6e747261637420697320696d706c656d656e74656420696e206e6174697665'},
    {address: CONTRACT_HELPER, expectedCode: '0x60e0604052602660808181529061073060a03960019061001f90826100d1565b5034801561002c57600080fd5b50610190565b634e487b7160e01b600052604160045260246000fd5b600181811c9082168061005c57607f821691505b60208210810361007c57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156100cc57600081815260208120601f850160051c810160208610156100a95750805b601f850160051c820191505b818110156100c8578281556001016100b5565b5050505b505050565b81516001600160401b038111156100ea576100ea610032565b6100fe816100f88454610048565b84610082565b602080601f831160018114610133576000841561011b5750858301515b600019600386901b1c1916600185901b1785556100c8565b600085815260208120601f198616915b8281101561016257888601518255948401946001909101908401610143565b50858210156101805787850151600019600388901b60f8161c191681555b5050505050600190811b01905550565b6105918061019f6000396000f3fe608060405234801561001057600080fd5b50600436106101215760003560e01c8063766c4f37116100ad578063c772ef6c11610071578063c772ef6c14610171578063ef7842501461022d578063f01fba931461023b578063f29694d814610249578063fde8a5601461026c57600080fd5b8063766c4f37146101dd57806377b6c9081461021f57806389f7d9ae1461022d5780639741860314610171578063abc000011461022d57600080fd5b80634706cc1c116100f45780634706cc1c1461017f5780635152b14c1461018d5780635c658165146101b35780636027dc611461017157806375b73606146101c157600080fd5b806301ffc9a71461012657806303aed6651461014e57806336de20f51461016357806339b9b24214610171575b600080fd5b6101396101343660046102fd565b61027a565b60405190151581526020015b60405180910390f35b61016161015c36600461034a565b6102a0565b005b61016161015c366004610384565b6101396101343660046103b7565b61016161015c3660046103d2565b61019b6101343660046103b7565b6040516001600160a01b039091168152602001610145565b610139610134366004610415565b6101cf6101343660046103b7565b604051908152602001610145565b6101f06101eb3660046103b7565b6102bb565b6040805182511515815260209283015180516001600160a01b0316848301529092015190820152606001610145565b61016161015c36600461043f565b61016161015c3660046103b7565b61016161015c366004610415565b6102576101343660046103b7565b60405163ffffffff9091168152602001610145565b61016161015c36600461047f565b6000600160405162461bcd60e51b815260040161029791906104af565b60405180910390fd5b600160405162461bcd60e51b815260040161029791906104af565b6102a060405180604001604052806000151581526020016102f8604051806040016040528060006001600160a01b03168152602001600081525090565b905290565b60006020828403121561030f57600080fd5b81356001600160e01b03198116811461032757600080fd5b9392505050565b80356001600160a01b038116811461034557600080fd5b919050565b6000806040838503121561035d57600080fd5b6103668361032e565b946020939093013593505050565b8035801515811461034557600080fd5b6000806040838503121561039757600080fd5b6103a08361032e565b91506103ae60208401610374565b90509250929050565b6000602082840312156103c957600080fd5b6103278261032e565b6000806000606084860312156103e757600080fd5b6103f08461032e565b92506103fe6020850161032e565b915061040c60408501610374565b90509250925092565b6000806040838503121561042857600080fd5b6104318361032e565b91506103ae6020840161032e565b6000806040838503121561045257600080fd5b61045b8361032e565b9150602083013563ffffffff8116811461047457600080fd5b809150509250929050565b6000806040838503121561049257600080fd5b61049b8361032e565b915060208301356003811061047457600080fd5b600060208083526000845481600182811c9150808316806104d157607f831692505b85831081036104ee57634e487b7160e01b85526022600452602485fd5b87860183815260200181801561050b57600181146105215761054c565b60ff198616825284151560051b8201965061054c565b60008b81526020902060005b868110156105465781548482015290850190890161052d565b83019750505b5094999850505050505050505056fea264697066735822122063505542f1c4602234fba58885c20aae30258ff8096b7f974a5563c90ad4a6c464736f6c634300081000337468697320636f6e747261637420697320696d706c656d656e74656420696e206e6174697665'},
>>>>>>> 3c77c1e2 (tests: eth_getCode)
  ].map(testCase => {
    itEth(`returns value for native contract: ${testCase.address}`, async ({helper}) => {
      const contractCodeSub = (await helper.callRpc('api.rpc.eth.getCode', [testCase.address])).toJSON();
      const contractCodeEth = (await helper.getWeb3().eth.getCode(testCase.address));

<<<<<<< HEAD
      expect(contractCodeSub).to.has.length.greaterThan(4);
      expect(contractCodeEth).to.has.length.greaterThan(4);
=======
      expect(contractCodeSub).to.eq(testCase.expectedCode);
      expect(contractCodeEth).to.eq(testCase.expectedCode);
>>>>>>> 3c77c1e2 (tests: eth_getCode)
    });
  });

  itEth('returns value for custom contract', async ({helper}) => {
    const signer = await helper.eth.createAccountWithBalance(donor);
    const flipper = await helper.eth.deployFlipper(signer);

    const contractCodeSub = (await helper.callRpc('api.rpc.eth.getCode', [flipper.options.address])).toJSON();
    const contractCodeEth = (await helper.getWeb3().eth.getCode(flipper.options.address));

<<<<<<< HEAD
    expect(contractCodeSub).to.has.length.greaterThan(4);
    expect(contractCodeEth).to.has.length.greaterThan(4);
=======
    expect(contractCodeSub).to.eq('0x6080604052348015600f57600080fd5b506004361060325760003560e01c806320965255146037578063cde4efa9146051575b600080fd5b603d6059565b6040516048919060b1565b60405180910390f35b6057606f565b005b60008060009054906101000a900460ff16905090565b60008054906101000a900460ff16156000806101000a81548160ff021916908315150217905550565b60008115159050919050565b60ab816098565b82525050565b600060208201905060c4600083018460a4565b9291505056fea264697066735822122077b6e0181f948cf0762391122339dd11290f54d8fd71596e8fe216ba8577e9f164736f6c63430008110033');
    expect(contractCodeEth).to.eq('0x6080604052348015600f57600080fd5b506004361060325760003560e01c806320965255146037578063cde4efa9146051575b600080fd5b603d6059565b6040516048919060b1565b60405180910390f35b6057606f565b005b60008060009054906101000a900460ff16905090565b60008054906101000a900460ff16156000806101000a81548160ff021916908315150217905550565b60008115159050919050565b60ab816098565b82525050565b600060208201905060c4600083018460a4565b9291505056fea264697066735822122077b6e0181f948cf0762391122339dd11290f54d8fd71596e8fe216ba8577e9f164736f6c63430008110033');
>>>>>>> 3c77c1e2 (tests: eth_getCode)
  });
});
