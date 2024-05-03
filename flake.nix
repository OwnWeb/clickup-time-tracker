{
  description = "Flake for the ClickUp Timetracking tool";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
        system = "x86_64-linux";
        pkgs = nixpkgs.leagacyPackages.${system};
    in {
        devShell = pkgs.mkShell {
            buildInputs = with pkgs; [
                nodejs-16_x
                nodePackages.npm
                nodePackages.vue-cli
                nodePackages.electron
            ];

            shellHook = ''
                vui-cli=service electron:serveni
            '';
        };

        packages.default = pkgs.stdenc.mkDerivation {
            name="clickup-time-tracker";
            src = ./.;
            buildInputs = with pkgs; [nodejs-16_x];

            buildPhase = ''
                echo "Building the electron application"
                npm install
                npm run build
            '';

        };
    };
}