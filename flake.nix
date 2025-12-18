{
  description = "CodeMirror Loupe language support - Development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-24.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          name = "codemirror-loupe-dev";

          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
            nodePackages.typescript
            nodePackages.typescript-language-server
          ];

          shellHook = ''
            echo "🔍 Loupe CodeMirror Development Environment"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "Node version: $(node --version)"
            echo "NPM version: $(npm --version)"
            echo ""
            echo "Available commands:"
            echo "  npm install       - Install dependencies"
            echo "  npm run build     - Build the library"
            echo "  npm run dev       - Run example app in dev mode"
            echo ""
            echo "First time setup:"
            echo "  npm install && npm run build"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
          '';
        };
      }
    );
}
