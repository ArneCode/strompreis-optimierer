"""Example FastAPI endpoint demonstrating device deletion.

DELETE /devices/{device_id}:
- Uses DeviceManager dependency
- Returns 204 on success, 404 if not found
"""
from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_device_manager
from device_manager import IDeviceManager

router = APIRouter()


@router.delete("/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int,
    manager: IDeviceManager = Depends(get_device_manager)
):
    success = manager.remove_device(device_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device {device_id} not found"
        )

    # 204 No Content is standard for successful deletions
    return None
