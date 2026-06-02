PROJECT_NAME ?= $(shell basename $(CURDIR))
VENV_NAME ?= $(PROJECT_NAME)
VENV_PYTHON_VERSION ?= 3.13
VENV_BIN_PATH ?= $(shell conda info --base)/envs/$(VENV_NAME)/bin
VENV_PYTHON ?= $(VENV_BIN_PATH)/python

export ENVIRONMENT ?= dev
export PYTHONPATH := .:./app
# export UV_NO_SYNC ?= 1
export PORT ?= 8711
export APP_URL ?= http://localhost:$(PORT)
.PHONY: all

print-vars:
	@echo "PROJECT_NAME: $(PROJECT_NAME)" 
	@echo "VENV_NAME: $(VENV_NAME)" 
	@echo "VENV_PYTHON_VERSION: $(VENV_PYTHON_VERSION)"
	@echo "VENV_BIN_PATH: $(VENV_BIN_PATH)" 
	@echo "VENV_PYTHON: $(VENV_PYTHON)"
	@echo "ENVIRONMENT: $(ENVIRONMENT)" 
	@echo "PYTHONPATH: $(PYTHONPATH)" 
	@echo "UV_NO_SYNC: $(UV_NO_SYNC)" 
	@echo "PORT: $(PORT)" 
	@echo "APP_URL: $(APP_URL)"


# ===== Environment =====

env-create:
	$(CONDA_EXE) create -n $(VENV_NAME) -c conda-forge -y --no-default-packages --format requirements.txt
	$(CONDA_EXE) install -n $(VENV_NAME) -c conda-forge -y python=$(VENV_PYTHON_VERSION)
	$(VENV_BIN_PATH)/pip install uv

env-install: env-create
	$(VENV_BIN_PATH)/uv pip install --python $(VENV_PYTHON) -r requirements.txt
	$(VENV_BIN_PATH)/uv add --no-sync --python $(VENV_PYTHON) --requirements requirements.txt
	if [ "$(ENVIRONMENT)" = "dev" ]; then \
		$(VENV_BIN_PATH)/uv pip install --python $(VENV_PYTHON) -r requirements-dev.txt; \
		$(VENV_BIN_PATH)/uv add --no-sync --python $(VENV_PYTHON) --dev --requirements requirements-dev.txt; \
	fi
	@$(MAKE) print-conda-activate

env-init: env-create
	$(VENV_BIN_PATH)/uv init --app --python $(VENV_PYTHON)
	@echo "# dependencies\n" > requirements.txt
	@echo "# dependencies\n" > requirements-dev.txt
	@echo "# environment variables\n" > .env
	@mkdir scripts
	@echo "#!/bin/bash\n" > scripts/run.sh
	@echo "set -euo pipefail\n" >> scripts/run.sh
	@echo "set -a && source .env && set +a\n" >> scripts/run.sh
	@echo "export VENV_PYTHON=$(VENV_PYTHON)\n" >> scripts/run.sh
	@echo "# start application\n" >> scripts/run.sh
	@echo "uv run --no-project --python \$$VENV_PYTHON main.py" >> scripts/run.sh
	@chmod +x scripts/run.sh
	@$(MAKE) print-conda-activate

env-remove:
	conda remove -n $(VENV_NAME) --all -y

env-update: env-remove env-install

print-conda-activate:
	@echo "#\n# To activate this environment, use:\n#\n#\t$$ conda activate $(VENV_NAME)"
	@echo "#\n# To deactivate an active environment, use:\n#\n#\t$$ conda deactivate\n"


#===== Run =====

run:
	./scripts/run.sh

run-docs-loaders:
	./scripts/run_docs_loaders.sh


# ===== Test =====

pytest:
	rm -f .reports/coverage*
	coverage run -m pytest -x -vv -W ignore::DeprecationWarning --failed-first
	coverage combine
	coverage html
	coverage report

smoke-test:
	./tests/smoke-test.sh $(APP_URL)

# ===== Format =====

format:
	set -x
	ruff check . --fix --config pyproject.toml
	ruff format . --config pyproject.toml

lint:
	set -e
	set -x
	mypy --config-file pyproject.toml .
	ruff check . --config pyproject.toml
	ruff format . --check --config pyproject.toml
