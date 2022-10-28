# Evm transaction payment pallet

pallet-evm-transaction-payment is a bridge between pallet-evm substrate calls and pallet-sponsoring.
It doesn't provide any sponsoring logic by itself, instead all sponsoring handlers
are loosly coupled via [`Config::EvmSponsorshipHandler`] trait.