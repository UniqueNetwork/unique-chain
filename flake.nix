{
  description = "Unique Network Node";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/release-25.05";
    nixpkgs-master.url = "github:nixos/nixpkgs/master";

    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };
    crane.url = "github:ipetkov/crane";
    shelly.url = "github:CertainLach/shelly";

    baedeker = {
      url = "github:UniqueNetwork/baedeker";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.shelly.follows = "shelly";
      inputs.rust-overlay.follows = "rust-overlay";
      inputs.flake-parts.follows = "flake-parts";
      inputs.crane.follows = "crane";
    };
    chainql = {
      url = "github:UniqueNetwork/chainql";
      inputs.nixpkgs.follows = "nixpkgs";
      inputs.shelly.follows = "shelly";
      inputs.rust-overlay.follows = "rust-overlay";
      inputs.flake-parts.follows = "flake-parts";
      inputs.crane.follows = "crane";
    };
  };
  outputs = inputs:
    let inherit (inputs.nixpkgs) lib;
    in inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.shelly.flakeModule ];
      systems = lib.systems.flakeExposed;
      perSystem = { pkgs, system, inputs', ... }:
        let
          rust = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
          craneLib = (inputs.crane.mkLib pkgs).overrideToolchain rust;
          pkgsMaster = import inputs.nixpkgs-master { inherit system; };
        in {
          _module.args.pkgs = import inputs.nixpkgs {
            inherit system;
            overlays = [ inputs.rust-overlay.overlays.default ];
          };

          shelly.shells.default = {
            factory = craneLib.devShell;
            packages = with pkgs; [
              # Build
              cargo-edit
              rustPlatform.bindgenHook
              pkg-config
              # TODO: OpenSSL seems to be optional, switch usage (fc-db) to rustls, or disable irrelevant database backends (we use sqlite for storage, why do we even bring openssl dependency?)
              openssl

              # Solidity stubs
              solc
              xxd

              # Deploy
              inputs'.baedeker.packages.baedeker
              inputs'.chainql.packages.chainql

              # Test
              nodejs_24
              pkgsMaster.deno
              (yarn-berry.override { nodejs = nodejs_24; })

              # Format
              taplo-cli
              (callPackage ./nix/prettier.nix { })

              # Nix
              cachix
              bashInteractive
            ];

            environment = {
                PROTOC = "${pkgs.protobuf}/bin/protoc";
                # https://github.com/tikv/jemallocator/issues/108
                NIX_CFLAGS_COMPILE = "-U_FORTIFY_SOURCE";
                NIX_HARDENING_ENABLE = "";
            };
          };
          formatter = pkgs.nixfmt-rfc-style;
        };
    };
}
