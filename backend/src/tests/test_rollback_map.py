import pytest
from rollback_map import RollbackMap


@pytest.fixture
def r_map():
    """Fixture for a new RollbackMap instance."""
    return RollbackMap[str]()


class TestRollbackMap:
    def test_initial_state(self, r_map: RollbackMap[str]):
        assert r_map.get(1) is None
        assert r_map.values() == []

    def test_set_and_get_staged(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        assert r_map.get(1) == "value1"
        assert r_map.values() == ["value1"]

    def test_set_and_commit(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.commit()
        assert r_map.get(1) == "value1"
        assert r_map.values() == ["value1"]
        # After commit, staged changes should be gone
        r_map.rollback()  # This should have no effect
        assert r_map.get(1) == "value1"

    def test_set_and_rollback(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.rollback()
        assert r_map.get(1) is None
        assert r_map.values() == []

    def test_update_staged(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.set(1, "value2")
        assert r_map.get(1) == "value2"
        assert r_map.values() == ["value2"]

    def test_update_committed(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.commit()
        r_map.set(1, "value2")
        assert r_map.get(1) == "value2"
        r_map.commit()
        assert r_map.get(1) == "value2"
        assert r_map.values() == ["value2"]

    def test_delete_staged(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.delete(1)
        assert r_map.get(1) is None
        assert r_map.values() == []

    def test_delete_committed(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.commit()
        r_map.delete(1)
        assert r_map.get(1) is None
        assert r_map.values() == []

    def test_delete_and_rollback(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.commit()
        r_map.delete(1)
        r_map.rollback()
        assert r_map.get(1) == "value1"
        assert r_map.values() == ["value1"]

    def test_delete_and_commit(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.commit()
        r_map.delete(1)
        r_map.commit()
        assert r_map.get(1) is None
        assert r_map.values() == []

    def test_delete_non_existent(self, r_map: RollbackMap[str]):
        r_map.delete(99)
        r_map.commit()
        assert r_map.get(99) is None
        assert r_map.values() == []

    def test_set_after_delete_staged(self, r_map: RollbackMap[str]):
        r_map.set(1, "value1")
        r_map.commit()
        r_map.delete(1)
        r_map.set(1, "value2")
        assert r_map.get(1) == "value2"
        assert r_map.values() == ["value2"]
        r_map.commit()
        assert r_map.get(1) == "value2"

    def test_complex_transaction(self, r_map: RollbackMap[str]):
        # Initial state
        r_map.set(1, "a")
        r_map.set(2, "b")
        r_map.commit()
        assert r_map.values().sort() == ["a", "b"].sort()

        # Start transaction
        r_map.set(1, "a_new")  # Update
        r_map.delete(2)        # Delete
        r_map.set(3, "c")      # Add

        # Check staged state
        assert r_map.get(1) == "a_new"
        assert r_map.get(2) is None
        assert r_map.get(3) == "c"
        assert sorted(r_map.values()) == sorted(["a_new", "c"])

        # Rollback
        r_map.rollback()

        # Check that we are back to the committed state
        assert r_map.get(1) == "a"
        assert r_map.get(2) == "b"
        assert r_map.get(3) is None
        assert sorted(r_map.values()) == sorted(["a", "b"])

    def test_repr(self, r_map: RollbackMap[str]):
        r_map.set(1, "a")
        r_map.set(2, "b")
        r_map.commit()
        r_map.set(1, "a_new")
        r_map.delete(2)
        assert repr(r_map) == "TransactionalMap({1: 'a_new'})"
