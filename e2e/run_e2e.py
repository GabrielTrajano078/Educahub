#!/usr/bin/env python3
"""Orquestrador E2E: stack Docker mínima + Playwright. Variáveis de ambiente já definidas (ex.: CI) não são sobrescritas pelo e2e/.env."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

E2E_ROOT = Path(__file__).resolve().parent
REPO_ROOT = E2E_ROOT.parent
PLAYWRIGHT_DIR = E2E_ROOT / "playwright"
COMPOSE_FILE = E2E_ROOT / "infra" / "docker-compose.yml"
ENV_RUN = E2E_ROOT / "infra" / ".env.run"
STATE_PATH = E2E_ROOT / ".e2e-state.json"
LOGS_DIR = E2E_ROOT / ".logs"
DOTENV_PATH = E2E_ROOT / ".env"


def load_dotenv_merge() -> None:
    if not DOTENV_PATH.is_file():
        return
    for raw in DOTENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def compose_cmd() -> list[str]:
    project = os.environ.get("E2E_PROJECT_NAME", "saeb-spas-e2e")
    return [
        "docker",
        "compose",
        "-f",
        str(COMPOSE_FILE),
        "-p",
        project,
        "--env-file",
        str(ENV_RUN),
    ]


def write_env_run() -> None:
    ENV_RUN.parent.mkdir(parents=True, exist_ok=True)
    port = os.environ.get("E2E_MONGO_PORT", "27018")
    ENV_RUN.write_text(f"E2E_MONGO_PORT={port}\n", encoding="utf-8")


def write_state(extra: dict | None = None) -> None:
    data = {
        "compose_project": os.environ.get("E2E_PROJECT_NAME", "saeb-spas-e2e"),
        "mongo_port": os.environ.get("E2E_MONGO_PORT", "27018"),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if extra:
        data.update(extra)
    STATE_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")


def cmd_up(args: argparse.Namespace) -> None:
    if STATE_PATH.is_file() and not args.force:
        print("Já existe .e2e-state.json. Use `up --force` para recriar.", file=sys.stderr)
        sys.exit(1)
    write_env_run()
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_path = LOGS_DIR / "docker-up.log"
    load_dotenv_merge()
    with open(log_path, "w", encoding="utf-8") as logf:
        subprocess.run(
            compose_cmd() + ["up", "--build", "--wait", "-d"],
            cwd=E2E_ROOT,
            check=True,
            stdout=logf,
            stderr=subprocess.STDOUT,
        )
    write_state()
    print(f"Stack no ar. Log: {log_path}")


def cmd_down() -> None:
    load_dotenv_merge()
    write_env_run()
    if ENV_RUN.is_file():
        subprocess.run(compose_cmd() + ["down"], cwd=E2E_ROOT, check=False)
        try:
            ENV_RUN.unlink()
        except OSError:
            pass
    if STATE_PATH.is_file():
        STATE_PATH.unlink()
    print("Stack derrubada e estado removido.")


def cmd_status() -> None:
    load_dotenv_merge()
    if STATE_PATH.is_file():
        print(STATE_PATH.read_text(encoding="utf-8"))
    else:
        print("(sem estado)")
    write_env_run()
    if ENV_RUN.is_file():
        subprocess.run(compose_cmd() + ["ps"], cwd=E2E_ROOT, check=False)


def cmd_logs(args: argparse.Namespace) -> None:
    load_dotenv_merge()
    write_env_run()
    if not ENV_RUN.is_file():
        print("Gere .env.run com `up` antes.", file=sys.stderr)
        sys.exit(1)
    tail = args.tail or "100"
    svc = args.service or "mongo"
    subprocess.run(compose_cmd() + ["logs", f"--tail={tail}", svc], cwd=E2E_ROOT, check=False)


def cmd_diagnose() -> None:
    load_dotenv_merge()
    print("=== .e2e-state.json ===")
    if STATE_PATH.is_file():
        print(STATE_PATH.read_text(encoding="utf-8"))
    else:
        print("(ausente)")
    print("\n=== compose ps ===")
    write_env_run()
    if ENV_RUN.is_file():
        subprocess.run(compose_cmd() + ["ps", "-a"], cwd=E2E_ROOT, check=False)
    pw_log = LOGS_DIR / "playwright.log"
    print("\n=== tail playwright.log ===")
    if pw_log.is_file():
        lines = pw_log.read_text(encoding="utf-8").splitlines()[-40:]
        print("\n".join(lines))
    else:
        print("(sem log)")


def cmd_test(args: argparse.Namespace) -> None:
    load_dotenv_merge()
    if not STATE_PATH.is_file():
        print("Aviso: sem .e2e-state.json (compose não registrado). Prosseguindo mesmo assim.", file=sys.stderr)
    env = os.environ.copy()
    env.setdefault("E2E_BASE_URL", "http://127.0.0.1:5173")
    if args.headed:
        env["E2E_HEADED"] = "1"
    if args.ui:
        env["E2E_UI"] = "1"
    if args.debug:
        env["E2E_DEBUG"] = "1"
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    pw_log = LOGS_DIR / "playwright.log"
    if not shutil.which("npm"):
        print("npm não encontrado no PATH.", file=sys.stderr)
        sys.exit(1)
    if not args.skip_install:
        subprocess.run(["npm", "ci"], cwd=PLAYWRIGHT_DIR, check=True)
        subprocess.run(
            ["npx", "playwright", "install", "chromium"],
            cwd=PLAYWRIGHT_DIR,
            check=True,
        )
    cmd = ["npx", "playwright", "test"]
    if args.grep:
        cmd.extend(["--grep", args.grep])
    if args.project:
        cmd.extend(["--project", args.project])
    if args.paths:
        cmd.extend(args.paths)
    if args.ui:
        cmd.append("--ui")
    elif args.debug:
        cmd.append("--debug")
    elif args.headed:
        cmd.extend(["--headed"])
    with open(pw_log, "w", encoding="utf-8") as logf:
        proc = subprocess.run(cmd, cwd=PLAYWRIGHT_DIR, env=env, stdout=logf, stderr=subprocess.STDOUT)
    if proc.returncode != 0:
        print(f"Playwright falhou (código {proc.returncode}). Ver {pw_log}", file=sys.stderr)
        sys.exit(proc.returncode)


def cmd_all(args: argparse.Namespace) -> None:
    teardown_fail = bool(os.environ.get("CI")) or args.teardown_on_failure
    teardown_ok = bool(os.environ.get("CI")) or args.teardown_on_success
    try:
        if args.force and STATE_PATH.is_file():
            cmd_down()
        if not STATE_PATH.is_file():
            cmd_up(argparse.Namespace(force=bool(args.force)))
        cmd_test(args)
    except subprocess.CalledProcessError:
        if teardown_fail:
            cmd_down()
        raise
    except SystemExit as e:
        if teardown_fail and e.code not in (0, None):
            cmd_down()
        raise
    else:
        if teardown_ok:
            cmd_down()


def cmd_setup_only(_args: argparse.Namespace) -> None:
    print(
        "setup-only: sem projeto Playwright de autenticação (storageState). "
        "Crie admin em /signup ou use seed do backend antes dos fluxos logados.",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Orquestrador E2E (Docker + Playwright)")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("setup-only", help="Reservado para setup de auth (no-op documentado)").set_defaults(
        func=cmd_setup_only
    )

    p_up = sub.add_parser("up", help="Sobe Mongo via compose e grava estado")
    p_up.add_argument("--force", action="store_true", help="Sobe mesmo com estado existente")
    p_up.set_defaults(func=cmd_up)

    sub.add_parser("down", help="Compose down e remove estado").set_defaults(func=lambda _a: cmd_down())

    sub.add_parser("status", help="Mostra estado e compose ps").set_defaults(func=lambda _a: cmd_status())

    p_logs = sub.add_parser("logs", help="Compose logs")
    p_logs.add_argument("service", nargs="?", default="mongo")
    p_logs.add_argument("--tail", default="100")
    p_logs.set_defaults(func=cmd_logs)

    sub.add_parser("diagnose", help="Dump de diagnóstico").set_defaults(func=lambda _a: cmd_diagnose())

    p_test = sub.add_parser("test", help="npm ci + Playwright")
    p_test.add_argument("paths", nargs="*", help="Caminhos de spec opcionais")
    p_test.add_argument("--grep", help="Filtra testes (Playwright --grep)")
    p_test.add_argument("--project", help="Projeto Playwright")
    p_test.add_argument("--skip-install", action="store_true")
    p_test.add_argument("--headed", action="store_true")
    p_test.add_argument("--ui", action="store_true")
    p_test.add_argument("--debug", action="store_true")
    p_test.set_defaults(func=cmd_test)

    p_all = sub.add_parser("all", help="up (se necessário) + test + down em CI ou com flags")
    p_all.add_argument("--force", action="store_true")
    p_all.add_argument("--teardown-on-failure", action="store_true", help="Derruba stack após falha")
    p_all.add_argument(
        "--teardown-on-success",
        action="store_true",
        help="Derruba stack após sucesso (fora do CI)",
    )
    p_all.add_argument("--grep")
    p_all.add_argument("--project")
    p_all.add_argument("--skip-install", action="store_true")
    p_all.add_argument("--headed", action="store_true")
    p_all.add_argument("--ui", action="store_true")
    p_all.add_argument("--debug", action="store_true")
    p_all.add_argument("paths", nargs="*")
    p_all.set_defaults(func=cmd_all)

    args = parser.parse_args()
    load_dotenv_merge()
    args.func(args)


if __name__ == "__main__":
    main()
