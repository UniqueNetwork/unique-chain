{ pkgs ? import <nixpkgs> { } }:
pkgs.stdenv.mkDerivation rec {
  name = "resolc";
  version = "0.4.1";
  src = pkgs.fetchurl {
    url =
      "https://github.com/paritytech/revive/releases/download/v${version}/resolc-x86_64-unknown-linux-musl";
    sha256 = "sha256-njUbjwr+owNNWAuG97Ku+GzpakAbcO+GW/hnRLMY0i0=";
  };
  phases = [ "installPhase" "patchPhase" ];
  installPhase = ''
    mkdir -p $out/bin
    cp $src $out/bin/resolc
    chmod +x $out/bin/resolc
  '';
}
