{
  description = "Unique Network Node";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/release-24.11";
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
  outputs =
    inputs:
    let
      inherit (inputs.nixpkgs) lib;
    in
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.shelly.flakeModule ];
      systems = lib.systems.flakeExposed;
      perSystem =
        {
          pkgs,
          system,
          inputs',
          ...
        }:
        let
          rust = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
          craneLib = (inputs.crane.mkLib pkgs).overrideToolchain rust;
        in
        {
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

              # Solidity stubs
              solc
              xxd

              # Deploy
              inputs'.baedeker.packages.baedeker
              inputs'.chainql.packages.chainql

              # Test
              nodejs_23
              (yarn-berry.override { nodejs = nodejs_23; })

              # Format
              taplo-cli
              (callPackage ./nix/prettier.nix { })

              # Nix
              cachix
              bashInteractive
            ];

            environment.PROTOC = "${pkgs.protobuf}/bin/protoc";
          };
          formatter = pkgs.nixfmt-rfc-style;
        };
    };
}
