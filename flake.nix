{
  description = "Unique network node";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.cargo2nix = {
    url = "github:cargo2nix/cargo2nix/release-0.11.0";
    inputs.nixpkgs.follows = "nixpkgs";
    inputs.flake-utils.follows = "flake-utils";
    inputs.rust-overlay.follows = "rust-overlay";
  };
  inputs.rust-overlay.url = "github:oxalica/rust-overlay";
  inputs.dream2nix.url = "github:nix-community/dream2nix";
  outputs = {
    self,
    nixpkgs,
    flake-utils,
    cargo2nix,
    rust-overlay,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      rustDate = "2022-06-21";
      pkgs = import nixpkgs {
        inherit system;
        overlays = [cargo2nix.overlays.default];
      };
      rust =
        (pkgs.rustChannelOf {
          date = rustDate;
          channel = "nightly";
        })
        .default
        .override {
          extensions = ["rust-src"];
          targets = ["wasm32-unknown-unknown"];
        };

      rustPkgsWasm = pkgs.rustBuilder.makePackageSet {
        rustVersion = rustDate;
        rustChannel = "nightly";
        rustProfile = "minimal";
        packageFun = import ./unique-chain/Cargo.nix;
        target = "wasm32-unknown-unknown";
        rootFeatures = [
          "unique-node/unique-runtime"
          "unique-node/opal-runtime"
          "unique-node/quartz-runtime"
        ];
      };
    in {
      devShell = (pkgs.mkShell.override {stdenv = pkgs.clangStdenv;}) {
        nativeBuildInputs = with pkgs; [
          alejandra
          gitMinimal
          cargo2nix.packages.${system}.default

          nodejs-14_x
          nodePackages.yarn

          pkgconfig
          openssl
          llvmPackages.libclang.lib
          llvmPackages.bintools
          clang_11
          llvm
          protobuf
          rust
        ];
        LIBCLANG_PATH = "${pkgs.llvmPackages.libclang.lib}/lib";
        PROTOC = "${pkgs.protobuf}/bin/protoc";
      };
      packages = let
        unique-runtime =
          ((rustPkgsWasm."unknown".unique-runtime."0.9.22" {}).overrideAttrs (final: this: {
            postInstall = ''
              ls $bin
            '';
          }))
          .bin;
      in {
        inherit unique-runtime;
      };
    });
}
