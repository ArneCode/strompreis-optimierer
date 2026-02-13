from dataclasses import dataclass


@dataclass(frozen=True)
class PVConfiguration:
    """
    Immutable configuration of a PV Generator.
    Contains only parameters relevant for forecast computation.
    """
    latitude: float
    longitude: float
    declination: float
    azimuth: float
    peak_power: float

def get_pv_configuration(generator) -> PVConfiguration:
    """
    Creates a PVConfiguration object from a given generator device.
    :param generator: the generator device
    :return: a PVConfiguration object
    """
    return PVConfiguration(
        float(generator.latitude),
        float(generator.longitude),
        float(generator.declination),
        float(generator.azimuth),
        float(generator.peak_power.get_value())
    )