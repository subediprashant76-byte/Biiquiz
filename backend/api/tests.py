from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from api.auth import require_organization_admin, require_super_admin
from api.super_admin_services import QueryParams


class SuperAdminContractTests(SimpleTestCase):
    def test_query_params_are_bounded_and_samples_are_opt_in(self):
        params = QueryParams({"page": "0", "pageSize": "999", "includeSamples": "true", "status": "In Progress"})
        self.assertEqual(params.page, 1)
        self.assertEqual(params.page_size, 100)
        self.assertTrue(params.include_samples)
        self.assertEqual(params.status, "in_progress")

    @patch("api.auth.get_session_user")
    def test_super_admin_and_organization_admin_are_separate(self, get_user):
        request = SimpleNamespace()
        super_admin = SimpleNamespace(role="admin", organization_id=None)
        organization_admin = SimpleNamespace(role="admin", organization_id="org-1")

        get_user.return_value = super_admin
        self.assertIs(require_super_admin(request), super_admin)
        with self.assertRaises(PermissionError):
            require_organization_admin(request)

        get_user.return_value = organization_admin
        self.assertIs(require_organization_admin(request), organization_admin)
        with self.assertRaises(PermissionError):
            require_super_admin(request)
