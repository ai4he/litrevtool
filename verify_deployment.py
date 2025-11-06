#!/usr/bin/env python3
"""
Deployment Verification Script
Tests that all new features from the deployment are properly configured.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy import inspect
from app.db.session import engine
import requests
import json

def test_database_schema():
    """Verify all new columns exist in the database."""
    print("=" * 60)
    print("1. DATABASE SCHEMA TEST")
    print("=" * 60)

    inspector = inspect(engine)
    columns = inspector.get_columns('search_jobs')
    column_names = [col['name'] for col in columns]

    required_columns = [
        'semantic_batch_mode',
        'prisma_metrics',
        'prisma_diagram_path',
        'latex_file_path',
        'bibtex_file_path'
    ]

    all_present = True
    for col in required_columns:
        status = '✓' if col in column_names else '✗'
        print(f"  {status} {col}")
        if col not in column_names:
            all_present = False

    print(f"\nTotal columns in search_jobs: {len(column_names)}")

    if all_present:
        print("✓ All required columns present!")
        return True
    else:
        print("✗ Missing required columns!")
        return False


def test_api_health():
    """Check if the API is running and healthy."""
    print("\n" + "=" * 60)
    print("2. API HEALTH TEST")
    print("=" * 60)

    try:
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            print(f"  ✓ Backend API is healthy: {response.json()}")
            return True
        else:
            print(f"  ✗ Backend API returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ Backend API is not responding: {e}")
        return False


def test_api_endpoints():
    """Verify new API endpoints are available."""
    print("\n" + "=" * 60)
    print("3. API ENDPOINTS TEST")
    print("=" * 60)

    try:
        response = requests.get('http://localhost:8000/docs', timeout=5)
        docs_html = response.text

        endpoints = [
            '/api/v1/jobs/{job_id}/pause',
            '/api/v1/jobs/{job_id}/resume',
            '/api/v1/jobs/{job_id}/prisma-diagram',
            '/api/v1/jobs/{job_id}/latex',
            '/api/v1/jobs/{job_id}/bibtex'
        ]

        all_present = True
        for endpoint in endpoints:
            # Check if endpoint appears in OpenAPI docs
            if endpoint in docs_html:
                print(f"  ✓ {endpoint}")
            else:
                print(f"  ✗ {endpoint}")
                all_present = False

        if all_present:
            print("\n✓ All new endpoints are available!")
            return True
        else:
            print("\n✗ Some endpoints are missing!")
            return False
    except Exception as e:
        print(f"  ✗ Could not check API docs: {e}")
        return False


def test_services():
    """Check if all PM2 services are running."""
    print("\n" + "=" * 60)
    print("4. PM2 SERVICES TEST")
    print("=" * 60)

    import subprocess
    try:
        result = subprocess.run(
            ['pm2', 'jlist'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            services = json.loads(result.stdout)
            required_services = ['litrev-backend', 'litrev-celery', 'litrev-frontend']

            all_running = True
            for service_name in required_services:
                service = next((s for s in services if s['name'] == service_name), None)
                if service and service['pm2_env']['status'] == 'online':
                    print(f"  ✓ {service_name}: online")
                else:
                    print(f"  ✗ {service_name}: offline or not found")
                    all_running = False

            if all_running:
                print("\n✓ All services are running!")
                return True
            else:
                print("\n✗ Some services are not running!")
                return False
        else:
            print(f"  ✗ Could not get PM2 status: {result.stderr}")
            return False
    except Exception as e:
        print(f"  ✗ Error checking services: {e}")
        return False


def test_redis():
    """Check if Redis is running."""
    print("\n" + "=" * 60)
    print("5. REDIS TEST")
    print("=" * 60)

    import subprocess
    try:
        result = subprocess.run(
            ['redis-cli', 'ping'],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0 and 'PONG' in result.stdout:
            print("  ✓ Redis is running")
            return True
        else:
            print("  ✗ Redis is not responding")
            return False
    except Exception as e:
        print(f"  ✗ Error checking Redis: {e}")
        return False


def main():
    """Run all verification tests."""
    print("\n" + "=" * 60)
    print("LITREVTOOL DEPLOYMENT VERIFICATION")
    print("=" * 60)

    results = {
        'Database Schema': test_database_schema(),
        'API Health': test_api_health(),
        'API Endpoints': test_api_endpoints(),
        'PM2 Services': test_services(),
        'Redis': test_redis()
    }

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)

    for test_name, passed in results.items():
        status = '✓ PASS' if passed else '✗ FAIL'
        print(f"  {status}: {test_name}")

    all_passed = all(results.values())

    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED - Deployment Successful!")
        print("=" * 60)
        print("\nNew features available:")
        print("  • Semantic Score Column in CSV exports")
        print("  • Semantic Batch Mode toggle")
        print("  • PRISMA Methodology Metrics tracking")
        print("  • PRISMA Flow Diagram generation (SVG)")
        print("  • LaTeX Systematic Review generation")
        print("  • BibTeX Citations export")
        print("  • Pause/Resume functionality for jobs")
        print("\nYou can now test these features in the web UI at:")
        print("  http://localhost:3001")
        return 0
    else:
        print("✗ SOME TESTS FAILED - Please review errors above")
        print("=" * 60)
        return 1


if __name__ == '__main__':
    sys.exit(main())
