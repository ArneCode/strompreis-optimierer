from dataclasses import dataclass


@dataclass(frozen=True)
class PVConfiguration:
    latitude: float
    longitude: float
    declination: float
    azimuth: float
    peak_power: float

def get_pv_configuration(generator) -> PVConfiguration:
    return PVConfiguration(
        float(generator.latitude),
        float(generator.longitude),
        float(generator.declination),
        float(generator.azimuth),
        float(generator.peak_power.get_value())
    )