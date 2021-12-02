#![feature(prelude_import)]
#[prelude_import]
use std::prelude::rust_2018::*;
#[macro_use]
extern crate std;
pub use pallet::*;
pub use eth::*;
pub mod eth {
    use core::marker::PhantomData;
    use evm_coder::{abi::AbiWriter, execution::Result, generate_stubgen, solidity_interface, types::*};
    use pallet_evm_coder_substrate::{SubstrateRecorder, WithRecorder};
    use pallet_evm::{ExitReason, ExitRevert, OnCreate, OnMethodCall, PrecompileOutput};
    use sp_core::H160;
    use crate::{
        AllowlistEnabled, Config, Owner, Pallet, SelfSponsoring, SponsorBasket, SponsoringRateLimit,
    };
    use frame_support::traits::Get;
    use up_sponsorship::SponsorshipHandler;
    use sp_std::{convert::TryInto, vec::Vec};
    struct ContractHelpers<T: Config>(SubstrateRecorder<T>);
    impl<T: Config> WithRecorder<T> for ContractHelpers<T> {
        fn recorder(&self) -> &SubstrateRecorder<T> {
            &self.0
        }
        fn into_recorder(self) -> SubstrateRecorder<T> {
            self.0
        }
    }
    impl<T: Config> ContractHelpers<T> {
        fn contract_owner(&self, contract_address: address) -> Result<address> {
            Ok(<Owner<T>>::get(contract_address))
        }
        fn sponsoring_enabled(&self, contract_address: address) -> Result<bool> {
            Ok(<SelfSponsoring<T>>::get(contract_address))
        }
        fn toggle_sponsoring(
            &mut self,
            caller: caller,
            contract_address: address,
            enabled: bool,
        ) -> Result<void> {
            <Pallet<T>>::ensure_owner(contract_address, caller)?;
            <Pallet<T>>::toggle_sponsoring(contract_address, enabled);
            Ok(())
        }
        fn set_sponsoring_rate_limit(
            &mut self,
            caller: caller,
            contract_address: address,
            rate_limit: uint32,
        ) -> Result<void> {
            <Pallet<T>>::ensure_owner(contract_address, caller)?;
            <Pallet<T>>::set_sponsoring_rate_limit(contract_address, rate_limit.into());
            Ok(())
        }
        fn get_sponsoring_rate_limit(&self, contract_address: address) -> Result<uint32> {
            Ok(<SponsoringRateLimit<T>>::get(contract_address)
                .try_into()
                .map_err(|_| "rate limit > u32::MAX")?)
        }
        fn allowed(&self, contract_address: address, user: address) -> Result<bool> {
            Ok(<Pallet<T>>::allowed(contract_address, user, true))
        }
        fn allowlist_enabled(&self, contract_address: address) -> Result<bool> {
            Ok(<AllowlistEnabled<T>>::get(contract_address))
        }
        fn toggle_allowlist(
            &mut self,
            caller: caller,
            contract_address: address,
            enabled: bool,
        ) -> Result<void> {
            <Pallet<T>>::ensure_owner(contract_address, caller)?;
            <Pallet<T>>::toggle_allowlist(contract_address, enabled);
            Ok(())
        }
        fn toggle_allowed(
            &mut self,
            caller: caller,
            contract_address: address,
            user: address,
            allowed: bool,
        ) -> Result<void> {
            <Pallet<T>>::ensure_owner(contract_address, caller)?;
            <Pallet<T>>::toggle_allowed(contract_address, user, allowed);
            Ok(())
        }
    }
    pub enum ContractHelpersCall<T: Config> {
        ERC165Call(::evm_coder::ERC165Call, PhantomData<(T)>),
        ContractOwner {
            contract_address: address,
        },
        SponsoringEnabled {
            contract_address: address,
        },
        ToggleSponsoring {
            contract_address: address,
            enabled: bool,
        },
        SetSponsoringRateLimit {
            contract_address: address,
            rate_limit: uint32,
        },
        GetSponsoringRateLimit {
            contract_address: address,
        },
        Allowed {
            contract_address: address,
            user: address,
        },
        AllowlistEnabled {
            contract_address: address,
        },
        ToggleAllowlist {
            contract_address: address,
            enabled: bool,
        },
        ToggleAllowed {
            contract_address: address,
            user: address,
            allowed: bool,
        },
    }
    #[automatically_derived]
    #[allow(unused_qualifications)]
    impl<T: ::core::fmt::Debug + Config> ::core::fmt::Debug for ContractHelpersCall<T> {
        fn fmt(&self, f: &mut ::core::fmt::Formatter) -> ::core::fmt::Result {
            match (&*self,) {
                (&ContractHelpersCall::ERC165Call(ref __self_0, ref __self_1),) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_tuple(f, "ERC165Call");
                    let _ = ::core::fmt::DebugTuple::field(debug_trait_builder, &&(*__self_0));
                    let _ = ::core::fmt::DebugTuple::field(debug_trait_builder, &&(*__self_1));
                    ::core::fmt::DebugTuple::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::ContractOwner {
                    contract_address: ref __self_0,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "ContractOwner");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::SponsoringEnabled {
                    contract_address: ref __self_0,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "SponsoringEnabled");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::ToggleSponsoring {
                    contract_address: ref __self_0,
                    enabled: ref __self_1,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "ToggleSponsoring");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "enabled",
                        &&(*__self_1),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::SetSponsoringRateLimit {
                    contract_address: ref __self_0,
                    rate_limit: ref __self_1,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "SetSponsoringRateLimit");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "rate_limit",
                        &&(*__self_1),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::GetSponsoringRateLimit {
                    contract_address: ref __self_0,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "GetSponsoringRateLimit");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::Allowed {
                    contract_address: ref __self_0,
                    user: ref __self_1,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "Allowed");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    let _ =
                        ::core::fmt::DebugStruct::field(debug_trait_builder, "user", &&(*__self_1));
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::AllowlistEnabled {
                    contract_address: ref __self_0,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "AllowlistEnabled");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::ToggleAllowlist {
                    contract_address: ref __self_0,
                    enabled: ref __self_1,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "ToggleAllowlist");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "enabled",
                        &&(*__self_1),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
                (&ContractHelpersCall::ToggleAllowed {
                    contract_address: ref __self_0,
                    user: ref __self_1,
                    allowed: ref __self_2,
                },) => {
                    let debug_trait_builder =
                        &mut ::core::fmt::Formatter::debug_struct(f, "ToggleAllowed");
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "contract_address",
                        &&(*__self_0),
                    );
                    let _ =
                        ::core::fmt::DebugStruct::field(debug_trait_builder, "user", &&(*__self_1));
                    let _ = ::core::fmt::DebugStruct::field(
                        debug_trait_builder,
                        "allowed",
                        &&(*__self_2),
                    );
                    ::core::fmt::DebugStruct::finish(debug_trait_builder)
                }
            }
        }
    }
    impl<T: Config> ContractHelpersCall<T> {
        #[doc = "contractOwner(address)"]
        const CONTRACT_OWNER: u32 = 1364373836u32;
        #[doc = "sponsoringEnabled(address)"]
        const SPONSORING_ENABLED: u32 = 1613225057u32;
        #[doc = "toggleSponsoring(address,bool)"]
        const TOGGLE_SPONSORING: u32 = 4239158662u32;
        #[doc = "setSponsoringRateLimit(address,uint32)"]
        const SET_SPONSORING_RATE_LIMIT: u32 = 2008467720u32;
        #[doc = "getSponsoringRateLimit(address)"]
        const GET_SPONSORING_RATE_LIMIT: u32 = 1628240573u32;
        #[doc = "allowed(address,address)"]
        const ALLOWED: u32 = 1550156133u32;
        #[doc = "allowlistEnabled(address)"]
        const ALLOWLIST_ENABLED: u32 = 3346198380u32;
        #[doc = "toggleAllowlist(address,bool)"]
        const TOGGLE_ALLOWLIST: u32 = 920527093u32;
        #[doc = "toggleAllowed(address,address,bool)"]
        const TOGGLE_ALLOWED: u32 = 1191627804u32;
        pub const fn interface_id() -> u32 {
            let mut interface_id = 0;
            interface_id ^= Self::CONTRACT_OWNER;
            interface_id ^= Self::SPONSORING_ENABLED;
            interface_id ^= Self::TOGGLE_SPONSORING;
            interface_id ^= Self::SET_SPONSORING_RATE_LIMIT;
            interface_id ^= Self::GET_SPONSORING_RATE_LIMIT;
            interface_id ^= Self::ALLOWED;
            interface_id ^= Self::ALLOWLIST_ENABLED;
            interface_id ^= Self::TOGGLE_ALLOWLIST;
            interface_id ^= Self::TOGGLE_ALLOWED;
            interface_id
        }
        pub fn supports_interface(interface_id: u32) -> bool {
            interface_id != 0xffffff
                && (interface_id == ::evm_coder::ERC165Call::INTERFACE_ID
                    || interface_id == Self::interface_id())
        }
        pub fn generate_solidity_interface(tc: &evm_coder::solidity::TypeCollector, is_impl: bool) {
            use evm_coder::solidity::*;
            use core::fmt::Write;
            let interface = SolidityInterface {
                name: "ContractHelpers",
                selector: Self::interface_id(),
                is: &["Dummy", "ERC165"],
                functions: (
                    SolidityFunction {
                        docs: &[],
                        selector: "contractOwner(address) 5152b14c",
                        name: "contractOwner",
                        mutability: SolidityMutability::View,
                        args: (<NamedArgument<address>>::new("contractAddress"),),
                        result: <UnnamedArgument<address>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "sponsoringEnabled(address) 6027dc61",
                        name: "sponsoringEnabled",
                        mutability: SolidityMutability::View,
                        args: (<NamedArgument<address>>::new("contractAddress"),),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "toggleSponsoring(address,bool) fcac6d86",
                        name: "toggleSponsoring",
                        mutability: SolidityMutability::Mutable,
                        args: (
                            <NamedArgument<address>>::new("contractAddress"),
                            <NamedArgument<bool>>::new("enabled"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "setSponsoringRateLimit(address,uint32) 77b6c908",
                        name: "setSponsoringRateLimit",
                        mutability: SolidityMutability::Mutable,
                        args: (
                            <NamedArgument<address>>::new("contractAddress"),
                            <NamedArgument<uint32>>::new("rateLimit"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "getSponsoringRateLimit(address) 610cfabd",
                        name: "getSponsoringRateLimit",
                        mutability: SolidityMutability::View,
                        args: (<NamedArgument<address>>::new("contractAddress"),),
                        result: <UnnamedArgument<uint32>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "allowed(address,address) 5c658165",
                        name: "allowed",
                        mutability: SolidityMutability::View,
                        args: (
                            <NamedArgument<address>>::new("contractAddress"),
                            <NamedArgument<address>>::new("user"),
                        ),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "allowlistEnabled(address) c772ef6c",
                        name: "allowlistEnabled",
                        mutability: SolidityMutability::View,
                        args: (<NamedArgument<address>>::new("contractAddress"),),
                        result: <UnnamedArgument<bool>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "toggleAllowlist(address,bool) 36de20f5",
                        name: "toggleAllowlist",
                        mutability: SolidityMutability::Mutable,
                        args: (
                            <NamedArgument<address>>::new("contractAddress"),
                            <NamedArgument<bool>>::new("enabled"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                    SolidityFunction {
                        docs: &[],
                        selector: "toggleAllowed(address,address,bool) 4706cc1c",
                        name: "toggleAllowed",
                        mutability: SolidityMutability::Mutable,
                        args: (
                            <NamedArgument<address>>::new("contractAddress"),
                            <NamedArgument<address>>::new("user"),
                            <NamedArgument<bool>>::new("allowed"),
                        ),
                        result: <UnnamedArgument<void>>::default(),
                    },
                ),
            };
            if is_impl {
                tc . collect ("// Common stubs holder\ncontract Dummy {\n\tuint8 dummy;\n\tstring stub_error = \"this contract is implemented in native\";\n}\ncontract ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool) {\n\t\trequire(false, stub_error);\n\t\tinterfaceID;\n\t\treturn true;\n\t}\n}\n" . into ()) ;
            } else {
                tc . collect ("// Common stubs holder\ninterface Dummy {\n}\ninterface ERC165 is Dummy {\n\tfunction supportsInterface(bytes4 interfaceID) external view returns (bool);\n}\n" . into ()) ;
            }
            let mut out = string::new();
            if "ContractHelpers".starts_with("Inline") {
                out.push_str("// Inline\n");
            }
            let _ = interface.format(is_impl, &mut out, tc);
            tc.collect(out);
        }
    }
    impl<T: Config> ::evm_coder::Call for ContractHelpersCall<T> {
        fn parse(
            method_id: u32,
            reader: &mut ::evm_coder::abi::AbiReader,
        ) -> ::evm_coder::execution::Result<Option<Self>> {
            use ::evm_coder::abi::AbiRead;
            match method_id {
                ::evm_coder::ERC165Call::INTERFACE_ID => {
                    return Ok(
                        ::evm_coder::ERC165Call::parse(method_id, reader)?.map(Self::ERC165Call)
                    )
                }
                Self::CONTRACT_OWNER => {
                    return Ok(Some(Self::ContractOwner {
                        contract_address: reader.abi_read()?,
                    }))
                }
                Self::SPONSORING_ENABLED => {
                    return Ok(Some(Self::SponsoringEnabled {
                        contract_address: reader.abi_read()?,
                    }))
                }
                Self::TOGGLE_SPONSORING => {
                    return Ok(Some(Self::ToggleSponsoring {
                        contract_address: reader.abi_read()?,
                        enabled: reader.abi_read()?,
                    }))
                }
                Self::SET_SPONSORING_RATE_LIMIT => {
                    return Ok(Some(Self::SetSponsoringRateLimit {
                        contract_address: reader.abi_read()?,
                        rate_limit: reader.abi_read()?,
                    }))
                }
                Self::GET_SPONSORING_RATE_LIMIT => {
                    return Ok(Some(Self::GetSponsoringRateLimit {
                        contract_address: reader.abi_read()?,
                    }))
                }
                Self::ALLOWED => {
                    return Ok(Some(Self::Allowed {
                        contract_address: reader.abi_read()?,
                        user: reader.abi_read()?,
                    }))
                }
                Self::ALLOWLIST_ENABLED => {
                    return Ok(Some(Self::AllowlistEnabled {
                        contract_address: reader.abi_read()?,
                    }))
                }
                Self::TOGGLE_ALLOWLIST => {
                    return Ok(Some(Self::ToggleAllowlist {
                        contract_address: reader.abi_read()?,
                        enabled: reader.abi_read()?,
                    }))
                }
                Self::TOGGLE_ALLOWED => {
                    return Ok(Some(Self::ToggleAllowed {
                        contract_address: reader.abi_read()?,
                        user: reader.abi_read()?,
                        allowed: reader.abi_read()?,
                    }))
                }
                _ => {}
            }
            return Ok(None);
        }
    }
    impl<T: Config> ::evm_coder::Weighted for ContractHelpersCall<T> {
        fn weight(&self) -> ::evm_coder::execution::DispatchInfo {
            type InternalCall = ContractHelpersCall;
            match self {
                InternalCall::ERC165Call(::evm_coder::ERC165Call::SupportsInterface { .. }) => {
                    100u64.into()
                }
                InternalCall::ContractOwner { .. } => ().into(),
                InternalCall::SponsoringEnabled { .. } => ().into(),
                InternalCall::ToggleSponsoring { .. } => ().into(),
                InternalCall::SetSponsoringRateLimit { .. } => ().into(),
                InternalCall::GetSponsoringRateLimit { .. } => ().into(),
                InternalCall::Allowed { .. } => ().into(),
                InternalCall::AllowlistEnabled { .. } => ().into(),
                InternalCall::ToggleAllowlist { .. } => ().into(),
                InternalCall::ToggleAllowed { .. } => ().into(),
            }
        }
    }
    impl<T: Config> ::evm_coder::Callable<ContractHelpersCall<T>> for ContractHelpers<T> {
        #[allow(unreachable_code)]
        fn call(
            &mut self,
            c: Msg<ContractHelpersCall>,
        ) -> ::evm_coder::execution::ResultWithPostInfo<::evm_coder::abi::AbiWriter> {
            use ::evm_coder::abi::AbiWrite;
            type InternalCall = ContractHelpersCall;
            match c.call {
                InternalCall::ERC165Call(::evm_coder::ERC165Call::SupportsInterface {
                    interface_id,
                }) => {
                    let mut writer = ::evm_coder::abi::AbiWriter::default();
                    writer.bool(&InternalCall::supports_interface(interface_id));
                    return Ok(writer.into());
                }
                _ => {}
            }
            let mut writer = ::evm_coder::abi::AbiWriter::default();
            match c.call {
                InternalCall::ContractOwner { contract_address } => {
                    let result = self.contract_owner(contract_address)?;
                    (&result).to_result()
                }
                InternalCall::SponsoringEnabled { contract_address } => {
                    let result = self.sponsoring_enabled(contract_address)?;
                    (&result).to_result()
                }
                InternalCall::ToggleSponsoring {
                    contract_address,
                    enabled,
                } => {
                    let result =
                        self.toggle_sponsoring(c.caller.clone(), contract_address, enabled)?;
                    (&result).to_result()
                }
                InternalCall::SetSponsoringRateLimit {
                    contract_address,
                    rate_limit,
                } => {
                    let result = self.set_sponsoring_rate_limit(
                        c.caller.clone(),
                        contract_address,
                        rate_limit,
                    )?;
                    (&result).to_result()
                }
                InternalCall::GetSponsoringRateLimit { contract_address } => {
                    let result = self.get_sponsoring_rate_limit(contract_address)?;
                    (&result).to_result()
                }
                InternalCall::Allowed {
                    contract_address,
                    user,
                } => {
                    let result = self.allowed(contract_address, user)?;
                    (&result).to_result()
                }
                InternalCall::AllowlistEnabled { contract_address } => {
                    let result = self.allowlist_enabled(contract_address)?;
                    (&result).to_result()
                }
                InternalCall::ToggleAllowlist {
                    contract_address,
                    enabled,
                } => {
                    let result =
                        self.toggle_allowlist(c.caller.clone(), contract_address, enabled)?;
                    (&result).to_result()
                }
                InternalCall::ToggleAllowed {
                    contract_address,
                    user,
                    allowed,
                } => {
                    let result =
                        self.toggle_allowed(c.caller.clone(), contract_address, user, allowed)?;
                    (&result).to_result()
                }
                _ => ::core::panicking::panic("internal error: entered unreachable code"),
            }
        }
    }
    pub struct HelpersOnMethodCall<T: Config>(PhantomData<*const T>);
    impl<T: Config> OnMethodCall<T> for HelpersOnMethodCall<T> {
        fn is_reserved(contract: &sp_core::H160) -> bool {
            contract == &T::ContractAddress::get()
        }
        fn is_used(contract: &sp_core::H160) -> bool {
            contract == &T::ContractAddress::get()
        }
        fn call(
            source: &sp_core::H160,
            target: &sp_core::H160,
            gas_left: u64,
            input: &[u8],
            value: sp_core::U256,
        ) -> Option<PrecompileOutput> {
            if !<Pallet<T>>::allowed(*target, *source, true) {
                return Some(PrecompileOutput {
                    exit_status: ExitReason::Revert(ExitRevert::Reverted),
                    cost: 0,
                    output: {
                        let mut writer = AbiWriter::new_call(147028384u32);
                        writer.string("Target contract is allowlisted");
                        writer.finish()
                    },
                    logs: ::alloc::vec::Vec::new(),
                });
            }
            if target != &T::ContractAddress::get() {
                return None;
            }
            let helpers = ContractHelpers::<T>(SubstrateRecorder::<T>::new(*target, gas_left));
            pallet_evm_coder_substrate::call(*source, helpers, value, input)
        }
        fn get_code(contract: &sp_core::H160) -> Option<Vec<u8>> {
            (contract == & T :: ContractAddress :: get ()) . then (| | b"`\xe0`@R`&`\x80\x81\x81R\x90a\x04\xf4`\xa09\x80Qa\x00&\x91`\x01\x91` \x90\x91\x01\x90a\x009V[P4\x80\x15a\x003W`\x00\x80\xfd[Pa\x01\rV[\x82\x80Ta\x00E\x90a\x00\xd2V[\x90`\x00R` `\x00 \x90`\x1f\x01` \x90\x04\x81\x01\x92\x82a\x00gW`\x00\x85Ua\x00\xadV[\x82`\x1f\x10a\x00\x80W\x80Q`\xff\x19\x16\x83\x80\x01\x17\x85Ua\x00\xadV[\x82\x80\x01`\x01\x01\x85U\x82\x15a\x00\xadW\x91\x82\x01[\x82\x81\x11\x15a\x00\xadW\x82Q\x82U\x91` \x01\x91\x90`\x01\x01\x90a\x00\x92V[Pa\x00\xb9\x92\x91Pa\x00\xbdV[P\x90V[[\x80\x82\x11\x15a\x00\xb9W`\x00\x81U`\x01\x01a\x00\xbeV[`\x01\x81\x81\x1c\x90\x82\x16\x80a\x00\xe6W`\x7f\x82\x16\x91P[` \x82\x10\x81\x14\x15a\x01\x07WcNH{q`\xe0\x1b`\x00R`\"`\x04R`$`\x00\xfd[P\x91\x90PV[a\x03\xd8\x80a\x01\x1c`\x009`\x00\xf3\xfe`\x80`@R4\x80\x15a\x00\x10W`\x00\x80\xfd[P`\x046\x10a\x00\x9eW`\x005`\xe0\x1c\x80c`\'\xdca\x11a\x00fW\x80c`\'\xdca\x14a\x01\"W\x80ca\x0c\xfa\xbd\x14a\x010W\x80cw\xb6\xc9\x08\x14a\x01SW\x80c\xc7r\xefl\x14a\x01\"W\x80c\xfc\xacm\x86\x14a\x00\xcbW`\x00\x80\xfd[\x80c\x01\xff\xc9\xa7\x14a\x00\xa3W\x80c6\xde \xf5\x14a\x00\xcbW\x80cG\x06\xcc\x1c\x14a\x00\xe0W\x80cQR\xb1L\x14a\x00\xeeW\x80c\\e\x81e\x14a\x01\x14W[`\x00\x80\xfd[a\x00\xb6a\x00\xb16`\x04a\x01\xa2V[a\x01aV[`@Q\x90\x15\x15\x81R` \x01[`@Q\x80\x91\x03\x90\xf3[a\x00\xdea\x00\xd96`\x04a\x01\xffV[a\x01\x87V[\x00[a\x00\xdea\x00\xd96`\x04a\x022V[a\x00\xfca\x00\xb16`\x04a\x02uV[`@Q`\x01`\x01`\xa0\x1b\x03\x90\x91\x16\x81R` \x01a\x00\xc2V[a\x00\xb6a\x00\xb16`\x04a\x02\x90V[a\x00\xb6a\x00\xb16`\x04a\x02uV[a\x01>a\x00\xb16`\x04a\x02uV[`@Qc\xff\xff\xff\xff\x90\x91\x16\x81R` \x01a\x00\xc2V[a\x00\xdea\x00\xd96`\x04a\x02\xbaV[`\x00`\x01`@QbF\x1b\xcd`\xe5\x1b\x81R`\x04\x01a\x01~\x91\x90a\x02\xfaV[`@Q\x80\x91\x03\x90\xfd[`\x01`@QbF\x1b\xcd`\xe5\x1b\x81R`\x04\x01a\x01~\x91\x90a\x02\xfaV[`\x00` \x82\x84\x03\x12\x15a\x01\xb4W`\x00\x80\xfd[\x815`\x01`\x01`\xe0\x1b\x03\x19\x81\x16\x81\x14a\x01\xccW`\x00\x80\xfd[\x93\x92PPPV[\x805`\x01`\x01`\xa0\x1b\x03\x81\x16\x81\x14a\x01\xeaW`\x00\x80\xfd[\x91\x90PV[\x805\x80\x15\x15\x81\x14a\x01\xeaW`\x00\x80\xfd[`\x00\x80`@\x83\x85\x03\x12\x15a\x02\x12W`\x00\x80\xfd[a\x02\x1b\x83a\x01\xd3V[\x91Pa\x02)` \x84\x01a\x01\xefV[\x90P\x92P\x92\x90PV[`\x00\x80`\x00``\x84\x86\x03\x12\x15a\x02GW`\x00\x80\xfd[a\x02P\x84a\x01\xd3V[\x92Pa\x02^` \x85\x01a\x01\xd3V[\x91Pa\x02l`@\x85\x01a\x01\xefV[\x90P\x92P\x92P\x92V[`\x00` \x82\x84\x03\x12\x15a\x02\x87W`\x00\x80\xfd[a\x01\xcc\x82a\x01\xd3V[`\x00\x80`@\x83\x85\x03\x12\x15a\x02\xa3W`\x00\x80\xfd[a\x02\xac\x83a\x01\xd3V[\x91Pa\x02)` \x84\x01a\x01\xd3V[`\x00\x80`@\x83\x85\x03\x12\x15a\x02\xcdW`\x00\x80\xfd[a\x02\xd6\x83a\x01\xd3V[\x91P` \x83\x015c\xff\xff\xff\xff\x81\x16\x81\x14a\x02\xefW`\x00\x80\xfd[\x80\x91PP\x92P\x92\x90PV[`\x00` \x80\x83R`\x00\x84T\x81`\x01\x82\x81\x1c\x91P\x80\x83\x16\x80a\x03\x1cW`\x7f\x83\x16\x92P[\x85\x83\x10\x81\x14\x15a\x03:WcNH{q`\xe0\x1b\x85R`\"`\x04R`$\x85\xfd[\x87\x86\x01\x83\x81R` \x01\x81\x80\x15a\x03WW`\x01\x81\x14a\x03hWa\x03\x93V[`\xff\x19\x86\x16\x82R\x87\x82\x01\x96Pa\x03\x93V[`\x00\x8b\x81R` \x90 `\x00[\x86\x81\x10\x15a\x03\x8dW\x81T\x84\x82\x01R\x90\x85\x01\x90\x89\x01a\x03tV[\x83\x01\x97PP[P\x94\x99\x98PPPPPPPPPV\xfe\xa2dipfsX\"\x12 \xde\xe1\xb0gnP\xa0\xbb\xa7\xaf\xbek+\xe6S6\n\xcd?\x0c+\x81\xebEq\x8c\xe3\xab\xaaC6UdsolcC\x00\x08\t\x003this contract is implemented in native" . to_vec ())
        }
    }
    pub struct HelpersOnCreate<T: Config>(PhantomData<*const T>);
    impl<T: Config> OnCreate<T> for HelpersOnCreate<T> {
        fn on_create(owner: H160, contract: H160) {
            <Owner<T>>::insert(contract, owner);
        }
    }
    pub struct HelpersContractSponsoring<T: Config>(PhantomData<*const T>);
    impl<T: Config> SponsorshipHandler<H160, (H160, Vec<u8>)> for HelpersContractSponsoring<T> {
        fn get_sponsor(who: &H160, call: &(H160, Vec<u8>)) -> Option<H160> {
            if <SelfSponsoring<T>>::get(&call.0) && <Pallet<T>>::allowed(call.0, *who, false) {
                let block_number = <frame_system::Pallet<T>>::block_number() as T::BlockNumber;
                if let Some(last_tx_block) = <SponsorBasket<T>>::get(&call.0, who) {
                    let rate_limit = <SponsoringRateLimit<T>>::get(&call.0);
                    let limit_time = last_tx_block + rate_limit;
                    if block_number > limit_time {
                        <SponsorBasket<T>>::insert(&call.0, who, block_number);
                        return Some(call.0);
                    }
                } else {
                    <SponsorBasket<T>>::insert(&call.0, who, block_number);
                    return Some(call.0);
                }
            }
            None
        }
    }
}
#[doc = r"
			The module that hosts all the
			[FRAME](https://docs.substrate.io/v3/runtime/frame)
			types needed to add this pallet to a
			runtime.
			"]
pub mod pallet {
    use evm_coder::execution::Result;
    use frame_support::pallet_prelude::*;
    use sp_core::H160;
    #[doc = r"
			Configuration trait of this pallet.

			Implement this type for a runtime in order to customize this pallet.
			"]
    pub trait Config: frame_system::Config + pallet_evm_coder_substrate::Config {
        type ContractAddress: Get<H160>;
        type DefaultSponsoringRateLimit: Get<Self::BlockNumber>;
    }
    #[scale_info(skip_type_params(T), capture_docs = "always")]
    #[doc = r"
			Custom [dispatch errors](https://docs.substrate.io/v3/runtime/events-and-errors)
			of this pallet.
			"]
    pub enum Error<T> {
        #[doc(hidden)]
        #[codec(skip)]
        __Ignore(
            frame_support::sp_std::marker::PhantomData<(T)>,
            frame_support::Never,
        ),
        #[doc = " This method is only executable by owner"]
        NoPermission,
    }
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl<T> ::scale_info::TypeInfo for Error<T>
        where
            frame_support::sp_std::marker::PhantomData<(T)>: ::scale_info::TypeInfo + 'static,
            T: 'static,
        {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                :: scale_info :: Type :: builder () . path (:: scale_info :: Path :: new ("Error" , "pallet_evm_contract_helpers::pallet")) . type_params (< [_] > :: into_vec (box [:: scale_info :: TypeParameter :: new ("T" , :: core :: option :: Option :: None)])) . docs_always (& ["\n\t\t\tCustom [dispatch errors](https://docs.substrate.io/v3/runtime/events-and-errors)\n\t\t\tof this pallet.\n\t\t\t"]) . variant (:: scale_info :: build :: Variants :: new () . variant ("NoPermission" , | v | v . index (0usize as :: core :: primitive :: u8) . docs_always (& ["This method is only executable by owner"])))
            }
        };
    };
    #[doc = r"
			The [pallet](https://docs.substrate.io/v3/runtime/frame#pallets) implementing
			the on-chain logic.
			"]
    pub struct Pallet<T>(frame_support::sp_std::marker::PhantomData<(T)>);
    const _: () = {
        impl<T> core::clone::Clone for Pallet<T> {
            fn clone(&self) -> Self {
                Self(core::clone::Clone::clone(&self.0))
            }
        }
    };
    const _: () = {
        impl<T> core::cmp::Eq for Pallet<T> {}
    };
    const _: () = {
        impl<T> core::cmp::PartialEq for Pallet<T> {
            fn eq(&self, other: &Self) -> bool {
                true && self.0 == other.0
            }
        }
    };
    const _: () = {
        impl<T> core::fmt::Debug for Pallet<T> {
            fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::fmt::Result {
                fmt.debug_tuple("Pallet").field(&self.0).finish()
            }
        }
    };
    #[allow(type_alias_bounds)]
    pub(super) type Owner<T: Config> = StorageMap<
        _GeneratedPrefixForStorageOwner<T>,
        Twox128,
        H160,
        H160,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    #[allow(type_alias_bounds)]
    pub(super) type SelfSponsoring<T: Config> = StorageMap<
        _GeneratedPrefixForStorageSelfSponsoring<T>,
        Twox128,
        H160,
        bool,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    #[allow(type_alias_bounds)]
    pub(super) type SponsoringRateLimit<T: Config> = StorageMap<
        _GeneratedPrefixForStorageSponsoringRateLimit<T>,
        Twox128,
        H160,
        T::BlockNumber,
        ValueQuery,
        T::DefaultSponsoringRateLimit,
        frame_support::traits::GetDefault,
    >;
    #[allow(type_alias_bounds)]
    pub(super) type SponsorBasket<T: Config> = StorageDoubleMap<
        _GeneratedPrefixForStorageSponsorBasket<T>,
        Twox128,
        H160,
        Twox128,
        H160,
        T::BlockNumber,
        OptionQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    #[allow(type_alias_bounds)]
    pub(super) type AllowlistEnabled<T: Config> = StorageMap<
        _GeneratedPrefixForStorageAllowlistEnabled<T>,
        Twox128,
        H160,
        bool,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    #[allow(type_alias_bounds)]
    pub(super) type Allowlist<T: Config> = StorageDoubleMap<
        _GeneratedPrefixForStorageAllowlist<T>,
        Twox128,
        H160,
        Twox128,
        H160,
        bool,
        ValueQuery,
        frame_support::traits::GetDefault,
        frame_support::traits::GetDefault,
    >;
    impl<T: Config> Pallet<T> {
        pub fn toggle_sponsoring(contract: H160, enabled: bool) {
            <SelfSponsoring<T>>::insert(contract, enabled);
        }
        pub fn set_sponsoring_rate_limit(contract: H160, rate_limit: T::BlockNumber) {
            <SponsoringRateLimit<T>>::insert(contract, rate_limit);
        }
        #[doc = " Default is returned if allowlist is disabled"]
        pub fn allowed(contract: H160, user: H160, default: bool) -> bool {
            if !<AllowlistEnabled<T>>::get(contract) {
                return default;
            }
            <Allowlist<T>>::get(&contract, &user) || <Owner<T>>::get(&contract) == user
        }
        pub fn toggle_allowlist(contract: H160, enabled: bool) {
            <AllowlistEnabled<T>>::insert(contract, enabled)
        }
        pub fn toggle_allowed(contract: H160, user: H160, allowed: bool) {
            <Allowlist<T>>::insert(contract, user, allowed);
        }
        pub fn ensure_owner(contract: H160, user: H160) -> Result<()> {
            {
                if !(<Owner<T>>::get(&contract) == user) {
                    {
                        return Err("no permission".into());
                    };
                }
            };
            Ok(())
        }
    }
    impl<T: Config> Pallet<T> {
        #[doc(hidden)]
        pub fn pallet_constants_metadata(
        ) -> frame_support::sp_std::vec::Vec<frame_support::metadata::PalletConstantMetadata>
        {
            ::alloc::vec::Vec::new()
        }
    }
    impl<T: Config> Pallet<T> {
        pub fn error_metadata() -> Option<frame_support::metadata::PalletErrorMetadata> {
            Some(frame_support::metadata::PalletErrorMetadata {
                ty: frame_support::scale_info::meta_type::<Error<T>>(),
            })
        }
    }
    #[doc = r" Type alias to `Pallet`, to be used by `construct_runtime`."]
    #[doc = r""]
    #[doc = r" Generated by `pallet` attribute macro."]
    #[deprecated(note = "use `Pallet` instead")]
    #[allow(dead_code)]
    pub type Module<T> = Pallet<T>;
    impl<T: Config> frame_support::traits::GetStorageVersion for Pallet<T> {
        fn current_storage_version() -> frame_support::traits::StorageVersion {
            frame_support::traits::StorageVersion::default()
        }
        fn on_chain_storage_version() -> frame_support::traits::StorageVersion {
            frame_support::traits::StorageVersion::get::<Self>()
        }
    }
    impl<T: Config> frame_support::traits::OnGenesis for Pallet<T> {
        fn on_genesis() {
            let storage_version = frame_support::traits::StorageVersion::default();
            storage_version.put::<Self>();
        }
    }
    impl<T: Config> frame_support::traits::PalletInfoAccess for Pallet<T> {
        fn index() -> usize {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::index::<
                Self,
            >()
            .expect(
                "Pallet is part of the runtime because pallet `Config` trait is \
						implemented by the runtime",
            )
        }
        fn name() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Self,
            >()
            .expect(
                "Pallet is part of the runtime because pallet `Config` trait is \
						implemented by the runtime",
            )
        }
        fn module_name() -> &'static str {
            < < T as frame_system :: Config > :: PalletInfo as frame_support :: traits :: PalletInfo > :: module_name :: < Self > () . expect ("Pallet is part of the runtime because pallet `Config` trait is \
						implemented by the runtime")
        }
        fn crate_version() -> frame_support::traits::CrateVersion {
            frame_support::traits::CrateVersion {
                major: 0u16,
                minor: 1u8,
                patch: 0u8,
            }
        }
    }
    impl<T: Config> frame_support::traits::StorageInfoTrait for Pallet<T> {
        fn storage_info() -> frame_support::sp_std::vec::Vec<frame_support::traits::StorageInfo> {
            #[allow(unused_mut)]
            let mut res = ::alloc::vec::Vec::new();
            {
                let mut storage_info = < Owner < T > as frame_support :: traits :: PartialStorageInfoTrait > :: partial_storage_info () ;
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = < SelfSponsoring < T > as frame_support :: traits :: PartialStorageInfoTrait > :: partial_storage_info () ;
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = < SponsoringRateLimit < T > as frame_support :: traits :: PartialStorageInfoTrait > :: partial_storage_info () ;
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = < SponsorBasket < T > as frame_support :: traits :: PartialStorageInfoTrait > :: partial_storage_info () ;
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = < AllowlistEnabled < T > as frame_support :: traits :: PartialStorageInfoTrait > :: partial_storage_info () ;
                res.append(&mut storage_info);
            }
            {
                let mut storage_info = < Allowlist < T > as frame_support :: traits :: PartialStorageInfoTrait > :: partial_storage_info () ;
                res.append(&mut storage_info);
            }
            res
        }
    }
    #[doc(hidden)]
    pub mod __substrate_call_check {
        #[doc(hidden)]
        pub use __is_call_part_defined_0 as is_call_part_defined;
    }
    #[doc = r"Contains one variant per dispatchable that can be called by an extrinsic."]
    #[codec(encode_bound())]
    #[codec(decode_bound())]
    #[scale_info(skip_type_params(T), capture_docs = "always")]
    #[allow(non_camel_case_types)]
    pub enum Call<T: Config> {
        #[doc(hidden)]
        #[codec(skip)]
        __Ignore(
            frame_support::sp_std::marker::PhantomData<(T,)>,
            frame_support::Never,
        ),
    }
    const _: () = {
        impl<T: Config> core::fmt::Debug for Call<T> {
            fn fmt(&self, fmt: &mut core::fmt::Formatter) -> core::fmt::Result {
                match *self {
                    Self::__Ignore(ref _0, ref _1) => fmt
                        .debug_tuple("Call::__Ignore")
                        .field(&_0)
                        .field(&_1)
                        .finish(),
                }
            }
        }
    };
    const _: () = {
        impl<T: Config> core::clone::Clone for Call<T> {
            fn clone(&self) -> Self {
                match self {
                    Self::__Ignore(ref _0, ref _1) => {
                        Self::__Ignore(core::clone::Clone::clone(_0), core::clone::Clone::clone(_1))
                    }
                }
            }
        }
    };
    const _: () = {
        impl<T: Config> core::cmp::Eq for Call<T> {}
    };
    const _: () = {
        impl<T: Config> core::cmp::PartialEq for Call<T> {
            fn eq(&self, other: &Self) -> bool {
                match (self, other) {
                    (Self::__Ignore(_0, _1), Self::__Ignore(_0_other, _1_other)) => {
                        true && _0 == _0_other && _1 == _1_other
                    }
                }
            }
        }
    };
    const _: () = {
        #[allow(non_camel_case_types)]
        impl<T: Config> ::codec::Encode for Call<T> {}
        impl<T: Config> ::codec::EncodeLike for Call<T> {}
    };
    const _: () = {
        #[allow(non_camel_case_types)]
        impl<T: Config> ::codec::Decode for Call<T> {
            fn decode<__CodecInputEdqy: ::codec::Input>(
                __codec_input_edqy: &mut __CodecInputEdqy,
            ) -> ::core::result::Result<Self, ::codec::Error> {
                match __codec_input_edqy
                    .read_byte()
                    .map_err(|e| e.chain("Could not decode `Call`, failed to read variant byte"))?
                {
                    _ => ::core::result::Result::Err(<_ as ::core::convert::Into<_>>::into(
                        "Could not decode `Call`, variant doesn\'t exist",
                    )),
                }
            }
        }
    };
    #[allow(non_upper_case_globals, unused_attributes, unused_qualifications)]
    const _: () = {
        impl<T: Config> ::scale_info::TypeInfo for Call<T>
        where
            frame_support::sp_std::marker::PhantomData<(T,)>: ::scale_info::TypeInfo + 'static,
            T: Config + 'static,
        {
            type Identity = Self;
            fn type_info() -> ::scale_info::Type {
                ::scale_info::Type::builder()
                    .path(::scale_info::Path::new(
                        "Call",
                        "pallet_evm_contract_helpers::pallet",
                    ))
                    .type_params(<[_]>::into_vec(box [::scale_info::TypeParameter::new(
                        "T",
                        ::core::option::Option::None,
                    )]))
                    .docs_always(&[
                        "Contains one variant per dispatchable that can be called by an extrinsic.",
                    ])
                    .variant(::scale_info::build::Variants::new())
            }
        };
    };
    impl<T: Config> Call<T> {}
    impl<T: Config> frame_support::dispatch::GetDispatchInfo for Call<T> {
        fn get_dispatch_info(&self) -> frame_support::dispatch::DispatchInfo {
            match *self {
                Self::__Ignore(_, _) => {
                    ::core::panicking::panic_fmt(::core::fmt::Arguments::new_v1(
                        &["internal error: entered unreachable code: "],
                        &match (&"__Ignore cannot be used",) {
                            (arg0,) => [::core::fmt::ArgumentV1::new(
                                arg0,
                                ::core::fmt::Display::fmt,
                            )],
                        },
                    ))
                }
            }
        }
    }
    impl<T: Config> frame_support::dispatch::GetCallName for Call<T> {
        fn get_call_name(&self) -> &'static str {
            match *self {
                Self::__Ignore(_, _) => {
                    ::core::panicking::panic_fmt(::core::fmt::Arguments::new_v1(
                        &["internal error: entered unreachable code: "],
                        &match (&"__PhantomItem cannot be used.",) {
                            (arg0,) => [::core::fmt::ArgumentV1::new(
                                arg0,
                                ::core::fmt::Display::fmt,
                            )],
                        },
                    ))
                }
            }
        }
        fn get_call_names() -> &'static [&'static str] {
            &[]
        }
    }
    impl<T: Config> frame_support::traits::UnfilteredDispatchable for Call<T> {
        type Origin = frame_system::pallet_prelude::OriginFor<T>;
        fn dispatch_bypass_filter(
            self,
            origin: Self::Origin,
        ) -> frame_support::dispatch::DispatchResultWithPostInfo {
            match self {
                Self::__Ignore(_, _) => {
                    let _ = origin;
                    {
                        {
                            ::core::panicking::panic_fmt(::core::fmt::Arguments::new_v1(
                                &["internal error: entered unreachable code: "],
                                &match (&"__PhantomItem cannot be used.",) {
                                    (arg0,) => [::core::fmt::ArgumentV1::new(
                                        arg0,
                                        ::core::fmt::Display::fmt,
                                    )],
                                },
                            ))
                        }
                    };
                }
            }
        }
    }
    impl<T: Config> frame_support::dispatch::Callable<T> for Pallet<T> {
        type Call = Call<T>;
    }
    impl<T: Config> Pallet<T> {
        #[doc(hidden)]
        pub fn call_functions() -> frame_support::metadata::PalletCallMetadata {
            frame_support::scale_info::meta_type::<Call<T>>().into()
        }
    }
    impl<T: Config> frame_support::sp_std::fmt::Debug for Error<T> {
        fn fmt(
            &self,
            f: &mut frame_support::sp_std::fmt::Formatter<'_>,
        ) -> frame_support::sp_std::fmt::Result {
            f.write_str(self.as_str())
        }
    }
    impl<T: Config> Error<T> {
        pub fn as_u8(&self) -> u8 {
            match &self {
                Self::__Ignore(_, _) => {
                    ::core::panicking::panic_fmt(::core::fmt::Arguments::new_v1(
                        &["internal error: entered unreachable code: "],
                        &match (&"`__Ignore` can never be constructed",) {
                            (arg0,) => [::core::fmt::ArgumentV1::new(
                                arg0,
                                ::core::fmt::Display::fmt,
                            )],
                        },
                    ))
                }
                Self::NoPermission => 0usize as u8,
            }
        }
        pub fn as_str(&self) -> &'static str {
            match &self {
                Self::__Ignore(_, _) => {
                    ::core::panicking::panic_fmt(::core::fmt::Arguments::new_v1(
                        &["internal error: entered unreachable code: "],
                        &match (&"`__Ignore` can never be constructed",) {
                            (arg0,) => [::core::fmt::ArgumentV1::new(
                                arg0,
                                ::core::fmt::Display::fmt,
                            )],
                        },
                    ))
                }
                Self::NoPermission => "NoPermission",
            }
        }
    }
    impl<T: Config> From<Error<T>> for &'static str {
        fn from(err: Error<T>) -> &'static str {
            err.as_str()
        }
    }
    impl<T: Config> From<Error<T>> for frame_support::sp_runtime::DispatchError {
        fn from(err: Error<T>) -> Self {
            let index = < < T as frame_system :: Config > :: PalletInfo as frame_support :: traits :: PalletInfo > :: index :: < Pallet < T > > () . expect ("Every active module has an index in the runtime; qed") as u8 ;
            frame_support::sp_runtime::DispatchError::Module {
                index,
                error: err.as_u8(),
                message: Some(err.as_str()),
            }
        }
    }
    #[doc(hidden)]
    pub mod __substrate_event_check {
        #[doc(hidden)]
        pub use __is_event_part_defined_1 as is_event_part_defined;
    }
    impl<T: Config> Pallet<T> {
        #[doc(hidden)]
        pub fn storage_metadata() -> frame_support::metadata::PalletStorageMetadata {
            frame_support :: metadata :: PalletStorageMetadata { prefix : < < T as frame_system :: Config > :: PalletInfo as frame_support :: traits :: PalletInfo > :: name :: < Pallet < T > > () . expect ("Every active pallet has a name in the runtime; qed") , entries : { # [allow (unused_mut)] let mut entries = :: alloc :: vec :: Vec :: new () ; { < Owner < T > as frame_support :: storage :: StorageEntryMetadataBuilder > :: build_metadata (:: alloc :: vec :: Vec :: new () , & mut entries) ; } { < SelfSponsoring < T > as frame_support :: storage :: StorageEntryMetadataBuilder > :: build_metadata (:: alloc :: vec :: Vec :: new () , & mut entries) ; } { < SponsoringRateLimit < T > as frame_support :: storage :: StorageEntryMetadataBuilder > :: build_metadata (:: alloc :: vec :: Vec :: new () , & mut entries) ; } { < SponsorBasket < T > as frame_support :: storage :: StorageEntryMetadataBuilder > :: build_metadata (:: alloc :: vec :: Vec :: new () , & mut entries) ; } { < AllowlistEnabled < T > as frame_support :: storage :: StorageEntryMetadataBuilder > :: build_metadata (:: alloc :: vec :: Vec :: new () , & mut entries) ; } { < Allowlist < T > as frame_support :: storage :: StorageEntryMetadataBuilder > :: build_metadata (:: alloc :: vec :: Vec :: new () , & mut entries) ; } entries } , }
        }
    }
    pub(super) struct _GeneratedPrefixForStorageOwner<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance for _GeneratedPrefixForStorageOwner<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
            .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "Owner";
    }
    pub(super) struct _GeneratedPrefixForStorageSelfSponsoring<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance
        for _GeneratedPrefixForStorageSelfSponsoring<T>
    {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
            .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "SelfSponsoring";
    }
    pub(super) struct _GeneratedPrefixForStorageSponsoringRateLimit<T>(
        core::marker::PhantomData<(T,)>,
    );
    impl<T: Config> frame_support::traits::StorageInstance
        for _GeneratedPrefixForStorageSponsoringRateLimit<T>
    {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
            .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "SponsoringRateLimit";
    }
    pub(super) struct _GeneratedPrefixForStorageSponsorBasket<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance
        for _GeneratedPrefixForStorageSponsorBasket<T>
    {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
            .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "SponsorBasket";
    }
    pub(super) struct _GeneratedPrefixForStorageAllowlistEnabled<T>(
        core::marker::PhantomData<(T,)>,
    );
    impl<T: Config> frame_support::traits::StorageInstance
        for _GeneratedPrefixForStorageAllowlistEnabled<T>
    {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
            .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "AllowlistEnabled";
    }
    pub(super) struct _GeneratedPrefixForStorageAllowlist<T>(core::marker::PhantomData<(T,)>);
    impl<T: Config> frame_support::traits::StorageInstance for _GeneratedPrefixForStorageAllowlist<T> {
        fn pallet_prefix() -> &'static str {
            <<T as frame_system::Config>::PalletInfo as frame_support::traits::PalletInfo>::name::<
                Pallet<T>,
            >()
            .expect("Every active pallet has a name in the runtime; qed")
        }
        const STORAGE_PREFIX: &'static str = "Allowlist";
    }
    #[doc(hidden)]
    pub mod __substrate_inherent_check {
        #[doc(hidden)]
        pub use __is_inherent_part_defined_2 as is_inherent_part_defined;
    }
    #[doc = r" Hidden instance generated to be internally used when module is used without"]
    #[doc = r" instance."]
    #[doc(hidden)]
    pub type __InherentHiddenInstance = ();
    pub(super) trait Store {
        type Owner;
        type SelfSponsoring;
        type SponsoringRateLimit;
        type SponsorBasket;
        type AllowlistEnabled;
        type Allowlist;
    }
    impl<T: Config> Store for Pallet<T> {
        type Owner = Owner<T>;
        type SelfSponsoring = SelfSponsoring<T>;
        type SponsoringRateLimit = SponsoringRateLimit<T>;
        type SponsorBasket = SponsorBasket<T>;
        type AllowlistEnabled = AllowlistEnabled<T>;
        type Allowlist = Allowlist<T>;
    }
    impl<T: Config> frame_support::traits::Hooks<<T as frame_system::Config>::BlockNumber>
        for Pallet<T>
    {
    }
    impl<T: Config> frame_support::traits::OnFinalize<<T as frame_system::Config>::BlockNumber>
        for Pallet<T>
    {
        fn on_finalize(n: <T as frame_system::Config>::BlockNumber) {
            let __within_span__ = {
                use ::tracing::__macro_support::Callsite as _;
                static CALLSITE: ::tracing::__macro_support::MacroCallsite = {
                    use ::tracing::__macro_support::MacroCallsite;
                    static META: ::tracing::Metadata<'static> = {
                        ::tracing_core::metadata::Metadata::new(
                            "on_finalize",
                            "pallet_evm_contract_helpers::pallet",
                            ::tracing::Level::TRACE,
                            Some("pallets/evm-contract-helpers/src/lib.rs"),
                            Some(7u32),
                            Some("pallet_evm_contract_helpers::pallet"),
                            ::tracing_core::field::FieldSet::new(
                                &[],
                                ::tracing_core::callsite::Identifier(&CALLSITE),
                            ),
                            ::tracing::metadata::Kind::SPAN,
                        )
                    };
                    MacroCallsite::new(&META)
                };
                let mut interest = ::tracing::subscriber::Interest::never();
                if ::tracing::Level::TRACE <= ::tracing::level_filters::STATIC_MAX_LEVEL
                    && ::tracing::Level::TRACE <= ::tracing::level_filters::LevelFilter::current()
                    && {
                        interest = CALLSITE.interest();
                        !interest.is_never()
                    }
                    && CALLSITE.is_enabled(interest)
                {
                    let meta = CALLSITE.metadata();
                    ::tracing::Span::new(meta, &{ meta.fields().value_set(&[]) })
                } else {
                    let span = CALLSITE.disabled_span();
                    {};
                    span
                }
            };
            let __tracing_guard__ = __within_span__.enter();
            < Self as frame_support :: traits :: Hooks < < T as frame_system :: Config > :: BlockNumber > > :: on_finalize (n)
        }
    }
    impl<T: Config> frame_support::traits::OnIdle<<T as frame_system::Config>::BlockNumber>
        for Pallet<T>
    {
        fn on_idle(
            n: <T as frame_system::Config>::BlockNumber,
            remaining_weight: frame_support::weights::Weight,
        ) -> frame_support::weights::Weight {
            < Self as frame_support :: traits :: Hooks < < T as frame_system :: Config > :: BlockNumber > > :: on_idle (n , remaining_weight)
        }
    }
    impl<T: Config> frame_support::traits::OnInitialize<<T as frame_system::Config>::BlockNumber>
        for Pallet<T>
    {
        fn on_initialize(
            n: <T as frame_system::Config>::BlockNumber,
        ) -> frame_support::weights::Weight {
            let __within_span__ = {
                use ::tracing::__macro_support::Callsite as _;
                static CALLSITE: ::tracing::__macro_support::MacroCallsite = {
                    use ::tracing::__macro_support::MacroCallsite;
                    static META: ::tracing::Metadata<'static> = {
                        ::tracing_core::metadata::Metadata::new(
                            "on_initialize",
                            "pallet_evm_contract_helpers::pallet",
                            ::tracing::Level::TRACE,
                            Some("pallets/evm-contract-helpers/src/lib.rs"),
                            Some(7u32),
                            Some("pallet_evm_contract_helpers::pallet"),
                            ::tracing_core::field::FieldSet::new(
                                &[],
                                ::tracing_core::callsite::Identifier(&CALLSITE),
                            ),
                            ::tracing::metadata::Kind::SPAN,
                        )
                    };
                    MacroCallsite::new(&META)
                };
                let mut interest = ::tracing::subscriber::Interest::never();
                if ::tracing::Level::TRACE <= ::tracing::level_filters::STATIC_MAX_LEVEL
                    && ::tracing::Level::TRACE <= ::tracing::level_filters::LevelFilter::current()
                    && {
                        interest = CALLSITE.interest();
                        !interest.is_never()
                    }
                    && CALLSITE.is_enabled(interest)
                {
                    let meta = CALLSITE.metadata();
                    ::tracing::Span::new(meta, &{ meta.fields().value_set(&[]) })
                } else {
                    let span = CALLSITE.disabled_span();
                    {};
                    span
                }
            };
            let __tracing_guard__ = __within_span__.enter();
            < Self as frame_support :: traits :: Hooks < < T as frame_system :: Config > :: BlockNumber > > :: on_initialize (n)
        }
    }
    impl<T: Config> frame_support::traits::OnRuntimeUpgrade for Pallet<T> {
        fn on_runtime_upgrade() -> frame_support::weights::Weight {
            let __within_span__ = {
                use ::tracing::__macro_support::Callsite as _;
                static CALLSITE: ::tracing::__macro_support::MacroCallsite = {
                    use ::tracing::__macro_support::MacroCallsite;
                    static META: ::tracing::Metadata<'static> = {
                        ::tracing_core::metadata::Metadata::new(
                            "on_runtime_update",
                            "pallet_evm_contract_helpers::pallet",
                            ::tracing::Level::TRACE,
                            Some("pallets/evm-contract-helpers/src/lib.rs"),
                            Some(7u32),
                            Some("pallet_evm_contract_helpers::pallet"),
                            ::tracing_core::field::FieldSet::new(
                                &[],
                                ::tracing_core::callsite::Identifier(&CALLSITE),
                            ),
                            ::tracing::metadata::Kind::SPAN,
                        )
                    };
                    MacroCallsite::new(&META)
                };
                let mut interest = ::tracing::subscriber::Interest::never();
                if ::tracing::Level::TRACE <= ::tracing::level_filters::STATIC_MAX_LEVEL
                    && ::tracing::Level::TRACE <= ::tracing::level_filters::LevelFilter::current()
                    && {
                        interest = CALLSITE.interest();
                        !interest.is_never()
                    }
                    && CALLSITE.is_enabled(interest)
                {
                    let meta = CALLSITE.metadata();
                    ::tracing::Span::new(meta, &{ meta.fields().value_set(&[]) })
                } else {
                    let span = CALLSITE.disabled_span();
                    {};
                    span
                }
            };
            let __tracing_guard__ = __within_span__.enter();
            let pallet_name = < < T as frame_system :: Config > :: PalletInfo as frame_support :: traits :: PalletInfo > :: name :: < Self > () . unwrap_or ("<unknown pallet name>") ;
            {
                let lvl = ::log::Level::Info;
                if lvl <= ::log::STATIC_MAX_LEVEL && lvl <= ::log::max_level() {
                    ::log::__private_api_log(
                        ::core::fmt::Arguments::new_v1(
                            &["\u{2705} no migration for "],
                            &match (&pallet_name,) {
                                (arg0,) => [::core::fmt::ArgumentV1::new(
                                    arg0,
                                    ::core::fmt::Display::fmt,
                                )],
                            },
                        ),
                        lvl,
                        &(
                            frame_support::LOG_TARGET,
                            "pallet_evm_contract_helpers::pallet",
                            "pallets/evm-contract-helpers/src/lib.rs",
                            7u32,
                        ),
                    );
                }
            };
            < Self as frame_support :: traits :: Hooks < < T as frame_system :: Config > :: BlockNumber > > :: on_runtime_upgrade ()
        }
    }
    impl<T: Config> frame_support::traits::OffchainWorker<<T as frame_system::Config>::BlockNumber>
        for Pallet<T>
    {
        fn offchain_worker(n: <T as frame_system::Config>::BlockNumber) {
            < Self as frame_support :: traits :: Hooks < < T as frame_system :: Config > :: BlockNumber > > :: offchain_worker (n)
        }
    }
    impl<T: Config> frame_support::traits::IntegrityTest for Pallet<T> {
        fn integrity_test() {
            < Self as frame_support :: traits :: Hooks < < T as frame_system :: Config > :: BlockNumber > > :: integrity_test ()
        }
    }
    #[doc(hidden)]
    pub mod __substrate_genesis_config_check {
        #[doc(hidden)]
        pub use __is_genesis_config_defined_3 as is_genesis_config_defined;
        #[doc(hidden)]
        pub use __is_std_enabled_for_genesis_3 as is_std_enabled_for_genesis;
    }
    #[doc(hidden)]
    pub mod __substrate_origin_check {
        #[doc(hidden)]
        pub use __is_origin_part_defined_4 as is_origin_part_defined;
    }
    #[doc(hidden)]
    pub mod __substrate_validate_unsigned_check {
        #[doc(hidden)]
        pub use __is_validate_unsigned_part_defined_5 as is_validate_unsigned_part_defined;
    }
}
