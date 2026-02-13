from device import GeneratorPV

class PVResult:
    blocks: dict[datetime, float]
    calc_time: datetime #when this result was calculated
    def get_generated_data_for_interval(self,start:datetime, end:datetime) -> Watt:
class PVData:
    lat,long,azim

    def __init__(self, generator: GeneratorPV):
        pass
class PVService:
    cache: dict[PVData, PVResult]

    def __init__(self):
        pass

    def get_generation_prognoses(self, generator: GeneratorPV) -> PVResult:
        data = PVData(generator)
        curr_time = datetime.now(...)
        if not (data in self.cache):
            # calc data
        result = self.cache.get(data)
        if curr_time - result.calc_time > 15 min:
            result = # calc data
        return result