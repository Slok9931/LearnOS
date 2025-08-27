from fastapi import APIRouter, HTTPException
from app.models.cpu import CPUScheduleRequest
from app.models.response import APIResponse
from app.services.cpu import CPUSchedulerService

router = APIRouter(prefix="/api/cpu", tags=["CPU Scheduling"])

@router.post("/schedule", response_model=APIResponse)
async def schedule_processes(request: CPUScheduleRequest):
    """
    Schedule processes using the specified algorithm
    """
    try:
        if request.algo == "FCFS":
            result = CPUSchedulerService.fcfs_scheduling(
                processes=request.processes,
                context_switch_cost=request.config.context_switch_cost
            )
        elif request.algo == "SJF":
            result = CPUSchedulerService.sjf_scheduling(
                processes=request.processes,
                context_switch_cost=request.config.context_switch_cost,
                preemptive=request.config.preemptive
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Algorithm '{request.algo}' not implemented yet"
            )
        
        return APIResponse(
            success=True,
            message=f"{request.algo} scheduling completed successfully",
            data=result
        )
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/algorithms")
async def get_supported_algorithms():
    """
    Get list of supported scheduling algorithms
    """
    return APIResponse(
        success=True,
        message="Supported algorithms retrieved",
        data={
            "algorithms": [
                {"name": "FCFS", "description": "First Come First Serve", "implemented": True},
                {"name": "SJF", "description": "Shortest Job First", "implemented": True},
                {"name": "Priority", "description": "Priority Scheduling", "implemented": False},
                {"name": "RoundRobin", "description": "Round Robin", "implemented": False},
                {"name": "MLFQ", "description": "Multi-Level Feedback Queue", "implemented": False}
            ]
        }
    )

@router.post("/test/sjf/non-preemptive")
async def test_sjf_non_preemptive():
    """
    Test Non-Preemptive SJF algorithm with dummy data
    """
    dummy_data = CPUScheduleRequest(
        algo="SJF",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "preemptive": False
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 2, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 1, "priority": 0},
            {"pid": 5, "arrival_time": 4, "burst_time": 3, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/sjf/preemptive")
async def test_sjf_preemptive():
    """
    Test Preemptive SJF (SRTF) algorithm with dummy data
    """
    dummy_data = CPUScheduleRequest(
        algo="SJF",
        config={
            "context_switch_cost": 0.5,
            "cores": 1,
            "preemptive": True
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 2, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 1, "priority": 0},
            {"pid": 5, "arrival_time": 4, "burst_time": 3, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)

@router.post("/test/fcfs")
async def test_fcfs():
    """
    Test FCFS algorithm with dummy data
    """
    dummy_data = CPUScheduleRequest(
        algo="FCFS",
        config={
            "context_switch_cost": 1.0,
            "cores": 1
        },
        processes=[
            {"pid": 1, "arrival_time": 0, "burst_time": 8, "priority": 0},
            {"pid": 2, "arrival_time": 1, "burst_time": 4, "priority": 0},
            {"pid": 3, "arrival_time": 2, "burst_time": 9, "priority": 0},
            {"pid": 4, "arrival_time": 3, "burst_time": 5, "priority": 0}
        ]
    )
    
    return await schedule_processes(dummy_data)