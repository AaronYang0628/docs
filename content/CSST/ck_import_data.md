+++
title = 'Import CSST Clickhouse Data'
date = 2024-03-17T19:58:45+08:00
weight = 2
+++

### Preliminary
- Clickhouse has installed though argo-workflow, if not check [link](kubernetes/argo/argo-workflow/software/clickhouse/index.html)
- Clickhouse server pod named is `app-clickhouse` and in namespace `application`

{{% notice style="warning" %}}
if the **pod name** and **namespace** isn't match, you might need to modify following shell.
{{% /notice %}}

### Download Data file
Currently, we mount a NFS disk to retrieve data.

### Using client tool
```shell
CK_HOST="172.27.253.66"
CK_PASSWORD=$(kubectl -n application get secret clickhouse-admin-credentials -o jsonpath='{.data.password}' | base64 -d) \
&& podman run --rm --entrypoint clickhouse-client -it m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine \
     --host ${CK_HOST} \
     --port 30900 \
     --user admin \
     --password ${CK_PASSWORD} \
     --query "select version()"
```

### Init Database
```sql
CREATE DATABASE IF NOT EXISTS csst ON CLUSTER default;

CREATE TABLE IF NOT EXISTS csst.msc_level2_catalog_local ON CLUSTER default
(
    level2_id Int64,
    OBSID String DEFAULT '',
    CCDNO Int32,
    objID Int32,
    X Float32,
    XErr Float64,
    Y Float32,
    YErr Float64,
    RA Float64,
    RAErr Float64,
    DEC Float64,
    DECErr Float64,
    A Float32,
    AErr Float32,
    B Float32,
    BErr Float32,
    PA Float32,
    Flag Int32,
    Flag_ISO Int32,
    Flag_ISO_Num Int32,
    FWHM Float32,
    AB Float32,
    E Float32,
    Flux_Kron Float64,
    FluxErr_Kron Float32,
    Mag_Kron Float64,
    MagErr_Kron Float64,
    Radius_Kron Float64,
    Sky Float32,
    Flux_Aper1 Float32,
    FluxErr_Aper1 Float32,
    Mag_Aper1 Float32,
    MagErr_Aper1 Float32,
    Flux_Aper2 Float32,
    FluxErr_Aper2 Float32,
    Mag_Aper2 Float32,
    MagErr_Aper2 Float32,
    Flux_Aper3 Float32,
    FluxErr_Aper3 Float32,
    Mag_Aper3 Float32,
    MagErr_Aper3 Float32,
    Flux_Aper4 Float32,
    FluxErr_Aper4 Float32,
    Mag_Aper4 Float32,
    MagErr_Aper4 Float32,
    Flux_Aper5 Float32,
    FluxErr_Aper5 Float32,
    Mag_Aper5 Float32,
    MagErr_Aper5 Float32,
    Flux_Aper6 Float32,
    FluxErr_Aper6 Float32,
    Mag_Aper6 Float32,
    MagErr_Aper6 Float32,
    Flux_Aper7 Float32,
    FluxErr_Aper7 Float32,
    Mag_Aper7 Float32,
    MagErr_Aper7 Float32,
    Flux_Aper8 Float32,
    FluxErr_Aper8 Float32,
    Mag_Aper8 Float32,
    MagErr_Aper8 Float32,
    Flux_Aper9 Float32,
    FluxErr_Aper9 Float32,
    Mag_Aper9 Float32,
    MagErr_Aper9 Float32,
    Flux_Aper10 Float32,
    FluxErr_Aper10 Float32,
    Mag_Aper10 Float32,
    MagErr_Aper10 Float32,
    Flux_Aper11 Float32,
    FluxErr_Aper11 Float32,
    Mag_Aper11 Float32,
    MagErr_Aper11 Float32,
    Flux_Aper12 Float32,
    FluxErr_Aper12 Float32,
    Mag_Aper12 Float32,
    MagErr_Aper12 Float32,
    Type Int32,
    R20 Float32,
    R50 Float32,
    R90 Float32,
    X_PSF Float64,
    Y_PSF Float64,
    RA_PSF Float64,
    DEC_PSF Float64,
    Chi2_PSF Float32,
    Flux_PSF Float32,
    FluxErr_PSF Float32,
    Mag_PSF Float32,
    MagErr_PSF Float32,
    X_Model Float64,
    Y_Model Float64,
    RA_Model Float64,
    DEC_Model Float64,
    Chi2_Model Float32,
    Flag_Model Int32,
    Flux_Model Float32,
    FluxErr_Model Float32,
    Mag_Model Float32,
    MagErr_Model Float32,
    Flux_Bulge Float32,
    FluxErr_Bulge Float32,
    Mag_Bulge Float32,
    MagErr_Bulge Float32,
    Re_Bulge Float32,
    ReErr_Bulge Float32,
    E_Bulge Float32,
    EErr_Bulge Float32,
    PA_Bulge Float32,
    PAErr_Bulge Float32,
    Flux_Disk Float32,
    FluxErr_Disk Float32,
    Mag_Disk Float32,
    MagErr_Disk Float32,
    Re_Disk Float32,
    ReErr_Disk Float32,
    E_Disk Float32,
    EErr_Disk Float32,
    PA_Disk Float32,
    PAErr_Disk Float32,
    Ratio_Disk Float32,
    RatioErr_Disk Float32,
    Spread_Model Float32,
    SpreadErr_Model Float32,
    Filter String DEFAULT '',
    Brick_Id Int32
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/csst_msc_level2_catalog','{replica}')
PARTITION BY round(modulo(Brick_Id,64))
ORDER BY (level2_id,Brick_Id)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS csst.msc_level2_catalog_all ON CLUSTER default AS csst.msc_level2_catalog_local
    ENGINE = Distributed(default, csst, msc_level2_catalog_local, rand());



CREATE DATABASE IF NOT EXISTS ephem ON CLUSTER default;

CREATE TABLE IF NOT EXISTS ephem.gaia3_source_local ON CLUSTER default
(
    solution_id Int64,
    designation String DEFAULT '',
    source_id Int64,
    random_index Int64,
    ref_epoch Float64,
    ra Float64,
    ra_error Float64,
    `dec` Float64,
    dec_error Float64,
    parallax Float64,
    parallax_error Float64,
    parallax_over_error Float64,
    pm Float64,
    pmra Float64,
    pmra_error Float64,
    pmdec Float64,
    pmdec_error Float64,
    ra_dec_corr Float64,
    ra_parallax_corr Float64,
    ra_pmra_corr Float64,
    ra_pmdec_corr Float64,
    dec_parallax_corr Float64,
    dec_pmra_corr Float64,
    dec_pmdec_corr Float64,
    parallax_pmra_corr Float64,
    parallax_pmdec_corr Float64,
    pmra_pmdec_corr Float64,
    astrometric_n_obs_al Int64,
    astrometric_n_obs_ac Int64,
    astrometric_n_good_obs_al Int64,
    astrometric_n_bad_obs_al Int64,
    astrometric_gof_al Float64,
    astrometric_chi2_al Float64,
    astrometric_excess_noise Float64,
    astrometric_excess_noise_sig Float64,
    astrometric_params_solved Int64,
    astrometric_primary_flag UInt8,
    nu_eff_used_in_astrometry Float64,
    pseudocolour Float64,
    pseudocolour_error Float64,
    ra_pseudocolour_corr Float64,
    dec_pseudocolour_corr Float64,
    parallax_pseudocolour_corr Float64,
    pmra_pseudocolour_corr Float64,
    pmdec_pseudocolour_corr Float64,
    astrometric_matched_transits Int64,
    visibility_periods_used Int64,
    astrometric_sigma5d_max Float64,
    matched_transits Int64,
    new_matched_transits Int64,
    matched_transits_removed Int64,
    ipd_gof_harmonic_amplitude Float64,
    ipd_gof_harmonic_phase Float64,
    ipd_frac_multi_peak Int64,
    ipd_frac_odd_win Int64,
    ruwe Float64,
    scan_direction_strength_k1 Float64,
    scan_direction_strength_k2 Float64,
    scan_direction_strength_k3 Float64,
    scan_direction_strength_k4 Float64,
    scan_direction_mean_k1 Float64,
    scan_direction_mean_k2 Float64,
    scan_direction_mean_k3 Float64,
    scan_direction_mean_k4 Float64,
    duplicated_source UInt8,
    phot_g_n_obs Int64,
    phot_g_mean_flux Float64,
    phot_g_mean_flux_error Float64,
    phot_g_mean_flux_over_error Float64,
    phot_g_mean_mag Float64,
    phot_bp_n_obs Int64,
    phot_bp_mean_flux Float64,
    phot_bp_mean_flux_error Float64,
    phot_bp_mean_flux_over_error Float64,
    phot_bp_mean_mag Float64,
    phot_rp_n_obs Int64,
    phot_rp_mean_flux Float64,
    phot_rp_mean_flux_error Float64,
    phot_rp_mean_flux_over_error Float64,
    phot_rp_mean_mag Float64,
    phot_bp_rp_excess_factor Float64,
    phot_bp_n_contaminated_transits Float64,
    phot_bp_n_blended_transits Float64,
    phot_rp_n_contaminated_transits Float64,
    phot_rp_n_blended_transits Float64,
    phot_proc_mode Float64,
    bp_rp Float64,
    bp_g Float64,
    g_rp Float64,
    radial_velocity Float64,
    radial_velocity_error Float64,
    rv_method_used Float64,
    rv_nb_transits Float64,
    rv_nb_deblended_transits Float64,
    rv_visibility_periods_used Float64,
    rv_expected_sig_to_noise Float64,
    rv_renormalised_gof Float64,
    rv_chisq_pvalue Float64,
    rv_time_duration Float64,
    rv_amplitude_robust Float64,
    rv_template_teff Float64,
    rv_template_logg Float64,
    rv_template_fe_h Float64,
    rv_atm_param_origin Float64,
    vbroad Float64,
    vbroad_error Float64,
    vbroad_nb_transits Float64,
    grvs_mag Float64,
    grvs_mag_error Float64,
    grvs_mag_nb_transits Float64,
    rvs_spec_sig_to_noise Float64,
    phot_variable_flag String DEFAULT '',
    l Float64,
    b Float64,
    ecl_lon Float64,
    ecl_lat Float64,
    in_qso_candidates UInt8,
    in_galaxy_candidates UInt8,
    non_single_star Int64,
    has_xp_continuous UInt8,
    has_xp_sampled UInt8,
    has_rvs UInt8,
    has_epoch_photometry UInt8,
    has_epoch_rv UInt8,
    has_mcmc_gspphot UInt8,
    has_mcmc_msc UInt8,
    in_andromeda_survey UInt8,
    classprob_dsc_combmod_quasar Float64,
    classprob_dsc_combmod_galaxy Float64,
    classprob_dsc_combmod_star Float64,
    teff_gspphot Float64,
    teff_gspphot_lower Float64,
    teff_gspphot_upper Float64,
    logg_gspphot Float64,
    logg_gspphot_lower Float64,
    logg_gspphot_upper Float64,
    mh_gspphot Float64,
    mh_gspphot_lower Float64,
    mh_gspphot_upper Float64,
    distance_gspphot Float64,
    distance_gspphot_lower Float64,
    distance_gspphot_upper Float64,
    azero_gspphot Float64,
    azero_gspphot_lower Float64,
    azero_gspphot_upper Float64,
    ag_gspphot Float64,
    ag_gspphot_lower Float64,
    ag_gspphot_upper Float64,
    ebpminrp_gspphot Float64,
    ebpminrp_gspphot_lower Float64,
    ebpminrp_gspphot_upper Float64,
    libname_gspphot String DEFAULT '',
    NS8HIdx Int32,
    NS16HIdx Int32,
    NS32HIdx Int32,
    NS64HIdx Int32,
    fileIdx Int32
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/gaia3','{replica}')
PARTITION BY round(modulo(NS8HIdx,20))
ORDER BY (NS8HIdx,NS16HIdx,NS32HIdx,NS64HIdx,fileIdx)
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS ephem.gaia3_source_all ON CLUSTER default AS ephem.gaia3_source_local
    ENGINE = Distributed(default, ephem, gaia3_source_local, rand());
```

### Import Data
{{< tabs title="Import " >}}
{{% tab title="One File" %}}
```shell
podman run --rm  -v /tmp/deploy:/tmp/deploy -v /tmp/native:/share/diskdata/gaia3 \
     --entrypoint clickhouse-client \
     -it m.daocloud.io/docker.io/clickhouse/clickhouse-server:23.11.5.29-alpine \
     --host ${CK_HOST}  \
     --port 30900  \
     --user admin  \
     --password ${CK_PASSWORD} \
     --query "insert into ephem.gaia3_source_all from infile /share/diskdata/gaia3/100751.native FORMAT Native" 
```

{{% /tab %}}
{{% tab title="Multiple File" %}}
#### 1. first you need to run a container
```shell
podman run --rm  -u root  -v /data:/data:ro   --entrypoint tail   -it docker.io/bitnami/clickhouse:23.10.5-debian-11-r0 -f /etc/hosts

## get into pod
# podman exec -it <$container_id> bash
```
dir `/data` saved all the xxx.native file

#### 2. when you in pod, you need to create a shell script `run.sh`
```sh
#!/bin/sh

INDEX=0
for filename in $(ls -l /data | awk '{print $NF}');
do
        INDEX=$(($INDEX+1))
        echo $(date) $INDEX $filename >> import.log
        clickhouse-client -h 172.27.253.66 --port=30900 --user admin --password YEkvhrhEaeZTf7E0 \
                --query "insert into ephem.gaia3_source_local FORMAT Native" < /data/$filename \
        || echo $filename >> import_err.log

done
```
Then you can use `sh run.sh` to import data into clickhouse and view `import_err.log` to trace the error.
{{% /tab %}}

{{< /tabs >}}
