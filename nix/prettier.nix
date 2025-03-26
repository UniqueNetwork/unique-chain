{
  buildNpmPackage,
  fetchFromGitHub,
  symlinkJoin,
  nodePackages,
  makeWrapper,
}:
let
  pname = "prettier-plugin-solidity";
  version = "1.4.2";
  prettier-plugin-solidity = buildNpmPackage {
    inherit pname version;
    src = fetchFromGitHub {
      owner = "prettier-solidity";
      repo = pname;

      rev = "refs/tags/v${version}";
      hash = "sha256-t+yRphqFPieQKD7UcaAgI4OnGc8qqyRW3s2yPRIdtro=";
    };
    npmDepsHash = "sha256-832tMzVOx93CYZ8qIEYS5TtGazYTtw9TOzEn1yZiEco=";
  };
in
symlinkJoin {
  name = "prettier-with-solidity";
  paths = [
    nodePackages.prettier
  ];
  buildInputs = [ makeWrapper ];
  postBuild = ''
    wrapProgram $out/bin/prettier \
      --add-flags "--plugin=${prettier-plugin-solidity}/lib/node_modules/prettier-plugin-solidity/dist/standalone.cjs"
  '';
}
